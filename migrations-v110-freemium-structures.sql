-- ============================================================================
-- IziSolo — v110 : le freemium et les structures (2026-09-13)
-- Lot 0 du chantier Associations & Studios (PLAN-ASSOS-STUDIOS-2026.md).
-- Re-runnable. À appliquer dans le SQL Editor Supabase, puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-freemium-structures.mjs
-- ----------------------------------------------------------------------------
-- Quatre gestes, tous décidés par Colin le 13/09 :
--
--   1. `profiles.type_structure` : solo | association | studio (défaut solo :
--      rien ne change pour personne) + `profiles.rna` (W + 9 chiffres, exigé
--      d'une association par l'écran, vérifié par le format ici).
--
--   2. Le CHECK des plans accepte `asso` et `studio`. `multi` / `multi_free`
--      restent acceptés (legacy, traités comme `studio`).
--
--   3. `plan_effectif()` réécrite en MIROIR de lib/trial.js effectivePlan() :
--      abonnement vivant ou plan offert → le plan (alias traduits) ; essai en
--      cours → le plan ESSAYÉ selon la structure (Complet / Association /
--      Studio) ; sinon Essentiel. ⚠️ Elle comptait encore 14 JOURS d'essai
--      alors que le code en compte 30 depuis le 6 septembre : entre le 15e et
--      le 30e jour, la base et l'écran ne disaient pas la même chose.
--
--   4. `compte_gele()` ne gèle plus QUE l'impayé (`unpaid` : le dunning Stripe
--      a rendu les armes et l'argent reste dû). La fin d'essai ne gèle plus
--      rien : la prof retombe sur Essentiel gratuit. Même 14 jours ici, même
--      correction. Les 5 triggers d'insert de v81 restent, avec un message qui
--      dit enfin la vraie raison.
-- ============================================================================

-- ── 1. Le type de structure et le RNA ────────────────────────────────────────
alter table public.profiles
  add column if not exists type_structure text not null default 'solo';

alter table public.profiles drop constraint if exists profiles_type_structure_check;
alter table public.profiles add constraint profiles_type_structure_check
  check (type_structure in ('solo', 'association', 'studio'));

alter table public.profiles
  add column if not exists rna text;

-- Le format seulement (comme le SIRET Luhn en JS) : la lettre W + 9 chiffres.
alter table public.profiles drop constraint if exists profiles_rna_check;
alter table public.profiles add constraint profiles_rna_check
  check (rna is null or rna ~ '^W[0-9]{9}$');

comment on column public.profiles.type_structure is
  'solo (la prof seule) | association (loi 1901, RNA exigé) | studio. Décide des libellés, du plan d''essai et des rubriques propres à chaque famille. Lecteur unique : lib/structure.js.';
comment on column public.profiles.rna is
  'Numéro RNA d''une association (W + 9 chiffres), garde-fou du plan Association. Null pour les autres structures.';

-- ── 2. Les plans acceptés ────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'solo', 'pro', 'asso', 'studio', 'multi', 'multi_free', 'premium'));

-- ── 3. Le plan effectif, miroir de lib/trial.js ──────────────────────────────
-- Alias legacy : premium → pro ; multi, multi_free → studio.
create or replace function public.plan_canonique(p_plan text)
returns text
language sql immutable as $$
  select case
    when p_plan = 'premium' then 'pro'
    when p_plan in ('multi', 'multi_free') then 'studio'
    when p_plan in ('solo', 'pro', 'asso', 'studio', 'free') then p_plan
    else 'solo'
  end;
$$;

-- Le plan qu'une structure ESSAIE (lib/structure.js planEssai).
create or replace function public.plan_essai(p_type_structure text)
returns text
language sql immutable as $$
  select case
    when p_type_structure = 'association' then 'asso'
    when p_type_structure = 'studio' then 'studio'
    else 'pro'
  end;
$$;

create or replace function public.plan_effectif(p_profile_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.plan = 'free' then 'free'
    -- abonnement Stripe vivant (active / trialing / past_due) : le plan payé
    when p.stripe_subscription_status in ('active', 'trialing', 'past_due')
      then public.plan_canonique(p.plan)
    -- plan payant posé à la main, sans Stripe : offert, il vaut abonné
    when p.stripe_subscription_status is null
         and p.plan in ('pro', 'premium', 'multi', 'multi_free', 'asso', 'studio')
      then public.plan_canonique(p.plan)
    -- essai 30 jours en cours : le plan essayé selon la structure
    when p.trial_started_at is not null
         and p.trial_started_at > now() - interval '30 days'
      then public.plan_essai(p.type_structure)
    -- tout le reste (essai fini, résiliée, impayée) : Essentiel gratuit
    else 'solo'
  end
  from public.profiles p
  where p.id = p_profile_id;
$$;

revoke all on function public.plan_effectif(uuid) from public, anon;
grant execute on function public.plan_effectif(uuid) to authenticated, service_role;

-- ── 4. Le gel : l'impayé, et rien d'autre ────────────────────────────────────
create or replace function public.compte_gele(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.id is null then false               -- profil introuvable : fail-open
    when p.plan = 'free' then false
    when p.stripe_subscription_status = 'unpaid' then true
    else false
  end
  from (select 1) as un
  left join public.profiles p on p.id = p_profile_id;
$$;

create or replace function public.check_compte_non_gele()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Seules les requêtes utilisateur (navigateur / session) sont contraintes.
  if coalesce(auth.role(), '') is distinct from 'authenticated' then
    return NEW;
  end if;
  if public.compte_gele(NEW.profile_id) then
    raise exception 'Ton abonnement IziSolo a un impayé : mets ta carte à jour (Paramètres → Abonnement IziSolo) pour continuer à créer.'
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

-- ── Constat ──────────────────────────────────────────────────────────────────
do $$
declare n_gratuit int; n_geles int;
begin
  select count(*) into n_gratuit from public.profiles p
   where public.plan_effectif(p.id) = 'solo' and p.plan <> 'free';
  select count(*) into n_geles from public.profiles p where public.compte_gele(p.id);
  raise notice '✅ v110 : type_structure + rna en place, plans asso/studio acceptés, % compte(s) sur Essentiel gratuit, % gelé(s) pour impayé', n_gratuit, n_geles;
end $$;

-- Vérifications utiles après application :
-- select plan, type_structure, public.plan_effectif(id) from public.profiles order by 3;
-- select public.compte_gele(id) from public.profiles where stripe_subscription_status = 'unpaid';
