-- Migration v26 : Policies RLS pour l'espace élève authentifié
--
-- Contexte : après login magic-link, l'élève accède à /p/[slug]/espace.
-- Les requêtes côté server (createServerClient avec cookies user) tournent
-- avec auth.uid() = id du user auth, et auth.email() = son adresse email.
--
-- Problème : la policy `clients.profile_id = auth.uid()` ne matche que pour
-- le pro propriétaire — l'élève (qui n'a PAS son id dans profiles) ne peut
-- pas lire sa propre fiche client. Donc l'espace affiche "pas de réservation".
--
-- Cette migration ajoute des policies "élève lit/édite ses propres données"
-- via le matching email = auth.email().
--
-- Idempotent : DROP POLICY IF EXISTS avant CREATE.

-- ── 1. clients : l'élève peut lire SES fiches client ──────────────────────
-- (un même email peut correspondre à plusieurs studios — c'est OK)
drop policy if exists "Eleve lit ses fiches client" on public.clients;
create policy "Eleve lit ses fiches client"
  on public.clients for select
  using (lower(email) = lower(coalesce(auth.email(), '')));

-- ── 2. paiements : l'élève voit ses propres paiements ────────────────────
drop policy if exists "Eleve lit ses paiements" on public.paiements;
create policy "Eleve lit ses paiements"
  on public.paiements for select
  using (
    client_id in (
      select c.id from public.clients c
      where lower(c.email) = lower(coalesce(auth.email(), ''))
    )
  );

-- ── 3. presences : l'élève voit ses propres présences ────────────────────
-- (en plus de la public-read v25 utilisée pour les counts du portail public)
drop policy if exists "Eleve lit ses presences" on public.presences;
create policy "Eleve lit ses presences"
  on public.presences for select
  using (
    client_id in (
      select c.id from public.clients c
      where lower(c.email) = lower(coalesce(auth.email(), ''))
    )
  );

-- ── 4. abonnements : l'élève voit ses abonnements ────────────────────────
drop policy if exists "Eleve lit ses abonnements" on public.abonnements;
create policy "Eleve lit ses abonnements"
  on public.abonnements for select
  using (
    client_id in (
      select c.id from public.clients c
      where lower(c.email) = lower(coalesce(auth.email(), ''))
    )
  );

-- ── 5. cours : l'élève voit les cours de ses studios (pour /espace) ──────
-- (en plus de la public-read v25 sur les 60 prochains jours)
-- Permet au student de voir des cours passés (historique) sur leurs studios.
drop policy if exists "Eleve lit cours de ses studios" on public.cours;
create policy "Eleve lit cours de ses studios"
  on public.cours for select
  using (
    profile_id in (
      select c.profile_id from public.clients c
      where lower(c.email) = lower(coalesce(auth.email(), ''))
    )
  );

-- ── Vérif ──
do $$
declare n int;
begin
  select count(*) into n
  from pg_policies
  where schemaname = 'public'
    and policyname like 'Eleve lit ses%' or policyname like 'Eleve lit cours%';
  raise notice '✅ Policies élève créées : %', n;
end $$;
