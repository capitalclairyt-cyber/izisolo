-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v31 : Hardening RLS — restreindre policies v25 au rôle `anon`
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Bug critique remonté le 2026-05-05 : un user authentifié sur SON dashboard
-- voyait les cours d'un autre studio (Maude). Cause : les policies SELECT
-- créées par migration v25 (`Public lit ... studios portail actif`) sont
-- appliquées à TOUS les rôles (anon + authenticated). Postgres combine les
-- policies en OR, donc un user authentifié hérite de cette policy
-- permissive en plus de ses propres policies — résultat : il peut lire les
-- cours/offres/profiles/presences/evenements de TOUS les studios qui ont
-- portail_actif = true.
--
-- Cette migration :
--   1. DROP les 5 policies v25 (créées sans qualification de rôle)
--   2. RECREATE les mêmes policies en les limitant à `TO anon` UNIQUEMENT
--
-- Pourquoi c'est SÛR :
--   - Visiteur anonyme du portail public `/p/[slug]` → rôle `anon` → policy v25 ✅
--   - Pro propriétaire de son studio → rôle `authenticated` + policy P1
--     (`profile_id = auth.uid()`) ✅
--   - Élève authentifié sur son espace `/p/[slug]/espace` → rôle
--     `authenticated` + policies v26 (matching email) ✅
--   - User authentifié qui essaye de lire les données d'un AUTRE studio
--     via DevTools → AUCUNE policy ne le matche → ne lit rien ✅
--
-- Edge case acceptable :
--   - Un user authentifié qui visite une page publique `/p/{autre-studio}`
--     ne verra plus les données. Il doit ouvrir en navigation privée pour
--     voir comme un visiteur. Cas très rare en pratique.
--
-- Idempotent : DROP IF EXISTS avant CREATE.

-- ── 1. profiles ────────────────────────────────────────────────────────────
drop policy if exists "Public lit profils portail actif" on public.profiles;
create policy "Public lit profils portail actif"
  on public.profiles for select
  to anon
  using (portail_actif = true);

-- ── 2. cours ───────────────────────────────────────────────────────────────
drop policy if exists "Public lit cours studios portail actif" on public.cours;
create policy "Public lit cours studios portail actif"
  on public.cours for select
  to anon
  using (
    coalesce(est_annule, false) = false
    and exists (
      select 1 from public.profiles p
      where p.id = cours.profile_id and p.portail_actif = true
    )
  );

-- ── 3. offres ──────────────────────────────────────────────────────────────
drop policy if exists "Public lit offres studios portail actif" on public.offres;
create policy "Public lit offres studios portail actif"
  on public.offres for select
  to anon
  using (
    actif = true
    and exists (
      select 1 from public.profiles p
      where p.id = offres.profile_id and p.portail_actif = true
    )
  );

-- ── 4. presences ───────────────────────────────────────────────────────────
drop policy if exists "Public lit presences studios portail actif" on public.presences;
create policy "Public lit presences studios portail actif"
  on public.presences for select
  to anon
  using (
    exists (
      select 1 from public.profiles p
      where p.id = presences.profile_id and p.portail_actif = true
    )
  );

-- ── 5. evenements ──────────────────────────────────────────────────────────
drop policy if exists "Public lit evenements studios portail actif" on public.evenements;
create policy "Public lit evenements studios portail actif"
  on public.evenements for select
  to anon
  using (
    exists (
      select 1 from public.profiles p
      where p.id = evenements.profile_id and p.portail_actif = true
    )
  );

-- ── Vérif : compte les policies v25 + leur restriction anon ────────────────
do $$
declare
  n_total int;
  n_anon  int;
begin
  select count(*) into n_total
  from pg_policies
  where schemaname = 'public' and policyname like 'Public lit%';

  select count(*) into n_anon
  from pg_policies
  where schemaname = 'public'
    and policyname like 'Public lit%'
    and 'anon' = any(roles);

  raise notice '✅ % policies v25 restreintes à anon only (% / %)', n_anon, n_anon, n_total;
  if n_anon < n_total then
    raise warning '⚠️ Certaines policies v25 ne sont PAS encore restreintes à anon !';
  end if;
end $$;
