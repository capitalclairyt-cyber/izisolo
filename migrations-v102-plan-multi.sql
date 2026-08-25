-- ============================================================================
-- MIGRATION v102 — Le plan Multi et sa bêta offerte
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================================
-- Lot 3 du chantier multi-prof (Colin, 2026-08-25 : « on est d'accord que tout
-- ça n'est accessible qu'au plan multi ? il faut aussi créer un plan free multi
-- pour les tests et les premiers studios qui vont tester »).
--
-- Deux nouvelles valeurs de plan :
--   multi       49 €/mois, forfait plat, profs illimitées
--   multi_free  la bêta offerte — le plan Multi À L'IDENTIQUE, moins la facture
--
-- ⚠️ POURQUOI CETTE MIGRATION EXISTE : `profiles.plan` porte un CHECK depuis
-- v56 (`profiles_plan_check`), qui n'autorise que free/solo/pro/premium. Sans
-- l'étendre, poser le plan Multi depuis /admin/users échoue en 23514 — la
-- fonctionnalité entière du lot 3 serait injoignable. Trouvé par la preuve,
-- pas par la relecture : l'UPDATE échouait pendant que le script continuait
-- comme si de rien n'était. Une écriture dont on ne lit pas l'erreur ment.
--
-- ⚠️ `multi_free` n'est PAS `free`. `free` = « ce compte ne suit aucune
-- règle » (interne, tout ouvert). `multi_free` = « ce compte suit exactement
-- les règles de Multi, on ne lui envoie pas la facture ». Une bêta posée sur
-- `free` testerait un produit qui n'existe pas et ne remonterait aucune
-- friction réelle. Côté JS, effectivePlan() traduit multi_free → multi,
-- exactement comme premium → pro ; le verrou CI `equipe.spec.js` fige les deux.
-- ============================================================================

-- 1. La contrainte accepte les deux nouvelles clés.
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'solo', 'pro', 'multi', 'multi_free', 'premium'));

-- 2. plan_effectif() (v56) : le miroir SQL d'effectivePlan().
--    Il servait à des triggers de quota aujourd'hui morts (v80), mais une
--    fonction qui rendrait 'solo' pour un studio Multi serait une bombe à
--    retardement le jour où quelqu'un s'en resservira.
create or replace function public.plan_effectif(p_profile_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.plan = 'free' then 'free'
    when p.plan = 'multi_free' then 'multi'      -- la bêta EST le plan payant
    when p.plan in ('multi', 'pro') then p.plan
    when p.plan = 'premium' then 'pro'           -- legacy, plus jamais vendu
    when p.stripe_subscription_status in ('active', 'trialing') then 'solo'
    when p.trial_started_at is not null
         and p.trial_started_at > now() - interval '14 days' then 'pro'
    else 'solo'
  end
  from public.profiles p
  where p.id = p_profile_id;
$$;

do $$
begin
  raise notice '✅ v102 : plans multi / multi_free acceptés (% studio(s) déjà dessus)',
    (select count(*) from public.profiles where plan in ('multi', 'multi_free'));
end $$;

-- ── Sonde (lecture seule, après application) ────────────────────────────────
-- select plan, count(*) from public.profiles group by 1 order by 2 desc;
