-- ============================================================
-- MIGRATION v56 — Purge du plan fantôme 'decouverte'
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Découverte (sonde prod 2026-06-12) : 13 profils sur 17 en plan
-- 'decouverte' — la colonne a gardé son DEFAULT du schéma v1
-- (migrations.sql:46), jamais migré lors de la refonte tarifaire
-- de mai (free/solo/pro/premium). CHAQUE nouvelle inscription
-- recevait encore ce plan inexistant.
--
-- Effet pervers : le code JS le traite comme Solo (fallback
-- planConfig), mais les triggers DB de limites testent l'égalité
-- avec 'solo' → ces comptes ÉCHAPPAIENT aux limites en base.
-- ============================================================

begin;

-- 1. Le compte démo interne passe en 'free' (exempté full access,
--    cf. CLAUDE.md — bonjour@melutek.com)
update public.profiles
   set plan = 'free'
 where plan not in ('free', 'solo', 'pro', 'premium')
   and id in (select id from auth.users where email = 'bonjour@melutek.com');

-- 2. Tous les autres plans inconnus → 'solo' (le plan d'entrée).
--    Les comptes en trial actif (trial_started_at < 14 j) restent
--    Pro EFFECTIF via plan_effectif()/lib/trial.js — aucun impact
--    pour les bêta-testeuses en cours d'essai.
update public.profiles
   set plan = 'solo'
 where plan not in ('free', 'solo', 'pro', 'premium');

-- 3. Le défaut d'inscription devient 'solo' (+ trial 14 j Pro via v33)
alter table public.profiles alter column plan set default 'solo';

-- 4. Verrou anti-récidive : valeurs de plan contraintes
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'solo', 'pro', 'premium'));

-- 5. plan_effectif() durci : toute valeur imprévue est traitée 'solo'
--    (défensif — la CHECK ci-dessus rend le cas théorique)
create or replace function public.plan_effectif(p_profile_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.plan = 'free' then 'free'
    when p.plan in ('pro', 'premium') then p.plan
    when p.stripe_subscription_status in ('active', 'trialing') then 'solo'
    when p.trial_started_at is not null
         and p.trial_started_at > now() - interval '14 days' then 'pro'
    else 'solo'
  end
  from public.profiles p
  where p.id = p_profile_id;
$$;

commit;
