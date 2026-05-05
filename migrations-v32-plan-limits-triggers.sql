-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v32 : triggers d'enforcement des limites de plan (defense in depth)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Contexte : la refonte des plans Solo/Pro/Premium définit des limites :
--   - Solo : 40 élèves max + 1 lieu max
--   - Pro  : 3 lieux max
--   - Premium / Free (interne) : illimité
--
-- Ces limites sont vérifiées côté code via lib/plan-guard.js, mais comme
-- les inserts se font directement via supabase-js depuis le client
-- (pas de route API gateway pour clients/lieux), un attaquant pourrait
-- bypasser la vérif via DevTools.
--
-- Cette migration ajoute des triggers BEFORE INSERT qui appliquent les
-- limites au niveau DB → impossible à bypasser quel que soit le client.
--
-- Idempotent : DROP IF EXISTS avant CREATE.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CLIENTS : limite Solo = 40 élèves actifs
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function check_clients_limit_for_plan()
returns trigger
language plpgsql
security definer
as $$
declare
  prof_plan text;
  current_count int;
  plan_limit int;
begin
  -- Récupère le plan du propriétaire du compte
  select plan into prof_plan
  from public.profiles
  where id = new.profile_id;

  -- Définit la limite selon le plan
  -- (free / pro / premium = illimité, solo = 40)
  plan_limit := case
    when coalesce(prof_plan, 'solo') = 'solo' then 40
    else null
  end;

  if plan_limit is null then
    return new;
  end if;

  -- Compte les élèves actifs (statuts qui consomment un slot)
  select count(*) into current_count
  from public.clients
  where profile_id = new.profile_id
    and statut in ('prospect', 'actif', 'fidele');

  if current_count >= plan_limit then
    raise exception
      'Limite de % élèves atteinte pour le plan %. Passe en Pro pour des élèves illimités.',
      plan_limit, prof_plan
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_clients_limit_for_plan on public.clients;
create trigger trg_check_clients_limit_for_plan
  before insert on public.clients
  for each row
  execute function check_clients_limit_for_plan();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. LIEUX : limite Solo = 1, Pro = 3, Premium / Free = illimité
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function check_lieux_limit_for_plan()
returns trigger
language plpgsql
security definer
as $$
declare
  prof_plan text;
  current_count int;
  plan_limit int;
begin
  select plan into prof_plan
  from public.profiles
  where id = new.profile_id;

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
        when prof_plan = 'pro'  then 'Passe en Premium pour des lieux illimités.'
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

-- ═══════════════════════════════════════════════════════════════════════════
-- Vérif
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  select count(*) into n
  from pg_trigger
  where tgname in ('trg_check_clients_limit_for_plan', 'trg_check_lieux_limit_for_plan')
    and not tgisinternal;
  raise notice '✅ % triggers d''enforcement plan créés', n;
end $$;
