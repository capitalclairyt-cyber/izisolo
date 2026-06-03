-- ============================================================================
-- Migration v51 — Garde-fous coût IA (extraction fiche par photo)
-- ============================================================================
-- Deux plafonds PAR PROF, 100% côté code :
--   1. Quota par jour      (anti-abus / anti-boucle) — ex. 50/jour
--   2. Budget mensuel       (le vrai garde-fou €) — 2 €/mois/prof ≈ 80 appels
--      au pire cas Opus 4.8 (~0,025 €/appel). La dépense réelle sera <= ça.
--
-- Les compteurs sont incrémentés AVANT l'appel au modèle (chaque appel, même
-- raté, est compté → on borne le nombre d'appels payants).
--
-- Table en RLS sans policy => inaccessible aux clients ; seule la fonction
-- SECURITY DEFINER (exécutée en tant que postgres) la lit/écrit. Le prof ne
-- peut donc pas trafiquer son propre compteur.
-- ============================================================================

-- Compteurs d'usage IA par prof. `periode` = le jour (quota journalier) OU le
-- 1er du mois (budget mensuel) ; on distingue les deux via le suffixe de
-- `feature` (ex. 'extract_photo' vs 'extract_photo:month'). Tout est per-prof,
-- donc profile_id est toujours renseigné (pas de souci de NULL en clé primaire).
create table if not exists public.ia_usage (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  periode date not null,
  feature text not null,
  count integer not null default 0,
  primary key (profile_id, periode, feature)
);
alter table public.ia_usage enable row level security;

-- Incrémente les compteurs jour + mois (du prof courant) de façon atomique et
-- renvoie l'autorisation.
-- Retour JSON : { allowed: bool, reason?: 'daily'|'monthly'|'unauthenticated',
--                 daily_used: int, monthly_used: int }
create or replace function public.check_and_bump_ia_usage(
  p_feature text,
  p_daily_limit int,
  p_monthly_limit int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := current_date;
  v_month date := date_trunc('month', current_date)::date;
  v_daily int;
  v_monthly int;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  end if;

  -- Budget mensuel du prof
  insert into public.ia_usage (profile_id, periode, feature, count)
  values (v_uid, v_month, p_feature || ':month', 1)
  on conflict (profile_id, periode, feature) do update set count = ia_usage.count + 1
  returning count into v_monthly;

  -- Quota journalier du prof
  insert into public.ia_usage (profile_id, periode, feature, count)
  values (v_uid, v_day, p_feature, 1)
  on conflict (profile_id, periode, feature) do update set count = ia_usage.count + 1
  returning count into v_daily;

  if v_monthly > p_monthly_limit then
    return jsonb_build_object('allowed', false, 'reason', 'monthly',
                              'daily_used', v_daily, 'monthly_used', v_monthly);
  end if;
  if v_daily > p_daily_limit then
    return jsonb_build_object('allowed', false, 'reason', 'daily',
                              'daily_used', v_daily, 'monthly_used', v_monthly);
  end if;

  return jsonb_build_object('allowed', true,
                            'daily_used', v_daily, 'monthly_used', v_monthly);
end;
$$;

revoke all on function public.check_and_bump_ia_usage(text, int, int) from public;
grant execute on function public.check_and_bump_ia_usage(text, int, int) to authenticated;
