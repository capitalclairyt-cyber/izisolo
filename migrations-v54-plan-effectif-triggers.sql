-- ============================================================
-- MIGRATION v54 — Plan effectif + triggers de limites (Sprint 3 audit)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE (idempotente).
-- ============================================================
-- Problème corrigé : les triggers v32 lisaient profiles.plan BRUT.
-- Un compte en TRIAL 14 jours (plan='solo' en DB mais Pro effectif,
-- cf. lib/trial.js) était donc bloqué à 40 élèves / 1 lieu pendant
-- son essai « Pro » → contradiction frontale avec l'argumentaire
-- d'onboarding. Anti-conversion pur.
--
-- Ajouts : limite de formules (offres) Solo = 5 + sondages réservés
-- Pro — les deux tables s'écrivent DIRECTEMENT depuis le navigateur
-- (pas de route API), seul un trigger DB peut les enforcer.
-- ============================================================

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. plan_effectif(profile_id) — réplique lib/trial.js effectivePlan()
--    ⚠️ DURÉE DU TRIAL : 14 jours, synchronisé avec TRIAL_DAYS
--    (lib/constantes.js). Si TRIAL_DAYS change, changer ici aussi.
-- ─────────────────────────────────────────────────────────────
create or replace function public.plan_effectif(p_profile_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select case
    -- comptes internes : tout illimité
    when p.plan = 'free' then 'free'
    -- plan payant assigné (manuel ou souscrit) : c'est le plan
    when p.plan in ('pro', 'premium') then p.plan
    -- souscription Stripe active sur un plan solo : solo payant
    when p.stripe_subscription_status in ('active', 'trialing') then coalesce(p.plan, 'solo')
    -- trial 14 jours en cours : accès Pro
    when p.trial_started_at is not null
         and p.trial_started_at > now() - interval '14 days' then 'pro'
    -- défaut : solo (limites appliquées)
    else coalesce(p.plan, 'solo')
  end
  from public.profiles p
  where p.id = p_profile_id;
$$;
revoke all on function public.plan_effectif(uuid) from public, anon;
grant execute on function public.plan_effectif(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. CLIENTS : limite Solo = 40 élèves actifs (v32 corrigée)
-- ─────────────────────────────────────────────────────────────
create or replace function check_clients_limit_for_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  prof_plan text;
  current_count int;
begin
  -- Plan EFFECTIF (trial 14j = pro) — plus le plan brut
  prof_plan := public.plan_effectif(new.profile_id);

  if coalesce(prof_plan, 'solo') <> 'solo' then
    return new;
  end if;

  select count(*) into current_count
  from public.clients
  where profile_id = new.profile_id
    and statut in ('prospect', 'actif', 'fidele');

  if current_count >= 40 then
    raise exception
      'Limite de 40 élèves atteinte pour le plan Solo. Passe en Pro pour des élèves illimités.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;
-- (le trigger v32 existe déjà et pointe sur cette fonction — pas besoin de le recréer,
-- mais on le fait quand même pour les bases neuves)
drop trigger if exists trg_check_clients_limit_for_plan on public.clients;
create trigger trg_check_clients_limit_for_plan
  before insert on public.clients
  for each row
  execute function check_clients_limit_for_plan();

-- ─────────────────────────────────────────────────────────────
-- 3. LIEUX : Solo = 1, Pro = 3, Premium/Free = illimité (v32 corrigée)
-- ─────────────────────────────────────────────────────────────
create or replace function check_lieux_limit_for_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  prof_plan text;
  current_count int;
  plan_limit int;
begin
  prof_plan := public.plan_effectif(new.profile_id);

  plan_limit := case
    when coalesce(prof_plan, 'solo') = 'solo' then 1
    when prof_plan = 'pro' then 3
    else null  -- premium, free : illimité
  end;

  if plan_limit is null then
    return new;
  end if;

  select count(*) into current_count
  from public.lieux
  where profile_id = new.profile_id;

  if current_count >= plan_limit then
    raise exception
      'Limite de % %s atteinte pour le plan %. %',
      plan_limit,
      case when plan_limit > 1 then 'lieux' else 'lieu' end,
      prof_plan,
      case
        when prof_plan = 'solo' then 'Passe en Pro pour gérer jusqu''à 3 lieux.'
        when prof_plan = 'pro'  then 'Passe en Studio pour des lieux illimités.'
        else ''
      end
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;
drop trigger if exists trg_check_lieux_limit_for_plan on public.lieux;
create trigger trg_check_lieux_limit_for_plan
  before insert on public.lieux
  for each row
  execute function check_lieux_limit_for_plan();

-- ─────────────────────────────────────────────────────────────
-- 4. OFFRES : limite Solo = 5 formules (NOUVEAU — levier pricing)
--    L'insert se fait depuis le navigateur (offres/nouveau) →
--    seul un trigger peut l'enforcer. Compte TOUTES les formules
--    (actives ou non), parité avec lib/plan-guard.js.
-- ─────────────────────────────────────────────────────────────
create or replace function check_offres_limit_for_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  prof_plan text;
  current_count int;
begin
  prof_plan := public.plan_effectif(new.profile_id);

  if coalesce(prof_plan, 'solo') <> 'solo' then
    return new;
  end if;

  select count(*) into current_count
  from public.offres
  where profile_id = new.profile_id;

  if current_count >= 5 then
    raise exception
      'Limite de 5 formules atteinte pour le plan Solo. Passe en Pro pour des formules illimitées !'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;
drop trigger if exists trg_check_offres_limit_for_plan on public.offres;
create trigger trg_check_offres_limit_for_plan
  before insert on public.offres
  for each row
  execute function check_offres_limit_for_plan();

-- ─────────────────────────────────────────────────────────────
-- 5. SONDAGES : feature Pro (NOUVEAU)
--    Création depuis le navigateur (sondages/nouveau) → trigger.
-- ─────────────────────────────────────────────────────────────
create or replace function check_sondages_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.plan_effectif(new.profile_id) = 'solo' then
    raise exception
      'Les sondages de planning nécessitent le plan Pro. Passe en Pro pour les activer !'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_check_sondages_plan on public.sondages_planning;
create trigger trg_check_sondages_plan
  before insert on public.sondages_planning
  for each row
  execute function check_sondages_plan();

commit;
