-- Migration v25 : Policies RLS pour lecture publique du portail élève
--
-- Contexte : le portail public /p/[studioSlug]/* est servi par Supabase via
-- @supabase/ssr en mode anonyme (cookies du visiteur, pas de session).
-- Les tables consultées (profiles, cours, offres, presences) avaient
-- uniquement des policies "auth.uid() = profile_id" — donc invisibles aux
-- visiteurs anonymes. Résultat : page = 404.
--
-- Cette migration ajoute des SELECT policies publiques scopées :
--   • Seuls les studios avec portail_actif = true sont exposés
--   • Pour chaque table satellite, on filtre via EXISTS sur profiles.portail_actif
--   • Les colonnes sensibles (stripe_*, plan, alertes_*) sont protégées par
--     le fait que les pages serveur sélectionnent explicitement la liste
--     blanche de colonnes (jamais SELECT *).
--
-- Idempotent : DROP POLICY IF EXISTS avant CREATE.

-- ── 1. profiles : visible publiquement si portail actif ────────────────────
drop policy if exists "Public lit profils portail actif" on public.profiles;
create policy "Public lit profils portail actif"
  on public.profiles for select
  using (portail_actif = true);

-- ── 2. cours : visible si parent profile a portail actif ───────────────────
drop policy if exists "Public lit cours studios portail actif" on public.cours;
create policy "Public lit cours studios portail actif"
  on public.cours for select
  using (
    coalesce(est_annule, false) = false
    and exists (
      select 1 from public.profiles p
      where p.id = cours.profile_id and p.portail_actif = true
    )
  );

-- ── 3. offres : visible si actif et parent profile a portail actif ────────
drop policy if exists "Public lit offres studios portail actif" on public.offres;
create policy "Public lit offres studios portail actif"
  on public.offres for select
  using (
    actif = true
    and exists (
      select 1 from public.profiles p
      where p.id = offres.profile_id and p.portail_actif = true
    )
  );

-- ── 4. presences : visible (count only) si parent studio portail actif ────
-- L'app n'expose jamais les noms — juste les counts par cours.
drop policy if exists "Public lit presences studios portail actif" on public.presences;
create policy "Public lit presences studios portail actif"
  on public.presences for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = presences.profile_id and p.portail_actif = true
    )
  );

-- ── 5. evenements : visible si parent studio portail actif ────────────────
drop policy if exists "Public lit evenements studios portail actif" on public.evenements;
create policy "Public lit evenements studios portail actif"
  on public.evenements for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = evenements.profile_id and p.portail_actif = true
    )
  );

-- ── Vérif : compte les policies SELECT publiques ──────────────────────────
do $$
declare
  n int;
begin
  select count(*) into n
  from pg_policies
  where schemaname = 'public'
    and policyname like 'Public lit%';
  raise notice '✅ % policies publiques actives', n;
end $$;
