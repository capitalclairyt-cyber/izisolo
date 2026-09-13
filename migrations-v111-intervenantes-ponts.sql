-- ============================================================================
-- IziSolo — v111 : les intervenantes et les ponts de l'écosystème (2026-09-13)
-- Lot 1 du chantier Associations & Studios (PLAN-ASSOS-STUDIOS-2026.md §4, §6).
-- Re-runnable. À appliquer APRÈS v103 (intervenant_id, portée de pointage) et
-- v110 (type de structure). Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-intervenantes-ponts.mjs
-- ----------------------------------------------------------------------------
-- Trois gestes :
--
--   1. `studio_membres` apprend à décrire une PERSONNE sans compte : prénom,
--      nom, bio, photo (le portail nomme la prof et montre l'équipe), et un
--      LIEN PERMANENT (sha256 du jeton, jamais le jeton ; expiration à la fin
--      de la saison ; révocable) qui ouvre `/intervenante/<jeton>` sans
--      session Supabase : ses séances, leur pointage, rien d'autre. C'est la
--      généralisation de v100, avec la même frontière : le chemin public passe
--      par des routes en service_role qui re-vérifient l'appartenance de
--      chaque présence au studio ET à la séance.
--
--   2. `recurrences.intervenant_id` : la série sait qui la donne, et chaque
--      séance qu'elle fabrique (ajout d'occurrence, ajustement) hérite de
--      l'intervenante, comme elle hérite déjà de la capacité (v109/09).
--
--   3. `invitations_structure` : le pont 1. Une prof fait entrer son
--      association ou son studio sur IziSolo ; à la création de la structure,
--      elle en devient membre automatiquement et la structure garde la trace
--      de qui l'a amenée (`profiles.parrainee_par`, pour le parrainage du
--      lot suivant). Coordonnées de tiers : lecture par la prof qui invite
--      seulement, jamais par le public ni par les élèves.
-- ============================================================================

-- ── 1. La personne derrière un membre, et son lien permanent ────────────────
alter table public.studio_membres
  add column if not exists prenom text,
  add column if not exists nom text,
  add column if not exists bio text,
  add column if not exists photo_url text,
  add column if not exists lien_hash text,
  add column if not exists lien_cree_at timestamptz,
  add column if not exists lien_expire_at timestamptz,
  add column if not exists lien_revoque_at timestamptz,
  add column if not exists lien_usages integer not null default 0,
  add column if not exists lien_derniere_utilisation_at timestamptz;

-- Un hash = un membre. Partiel : la plupart des lignes n'ont pas de lien.
create unique index if not exists idx_studio_membres_lien_hash
  on public.studio_membres (lien_hash)
  where lien_hash is not null;

comment on column public.studio_membres.lien_hash is
  'sha256 du jeton du lien permanent d''intervenante (/intervenante/<jeton>). Le jeton n''est jamais stocké et n''est affiché qu''une fois. Lecteur unique : lib/lien-intervenante.js.';

-- ── 2. La série sait qui la donne ───────────────────────────────────────────
alter table public.recurrences
  add column if not exists intervenant_id uuid
  references public.studio_membres(id) on delete set null;

-- ── 3. Le pont 1 : une prof fait entrer sa structure ────────────────────────
create table if not exists public.invitations_structure (
  id                    uuid primary key default gen_random_uuid(),
  -- La prof qui invite : SON studio (= profiles.id) et SA personne.
  parrain_profile_id    uuid not null references public.profiles(id) on delete cascade,
  parrain_auth_user_id  uuid references auth.users(id) on delete set null,
  -- La structure à faire entrer.
  email_structure       text not null,
  nom_structure         text not null,
  type_structure        text not null check (type_structure in ('association', 'studio')),
  message               text,
  -- Le jeton du lien d'invitation (sha256), à usage unique.
  token_hash            text not null unique,
  statut                text not null default 'envoyee'
                        check (statut in ('envoyee', 'acceptee', 'annulee')),
  -- Posé à l'acceptation : la structure créée.
  structure_profile_id  uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  acceptee_at           timestamptz,
  expire_at             timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_invitations_structure_parrain
  on public.invitations_structure (parrain_profile_id, statut);

alter table public.invitations_structure enable row level security;

-- La prof lit et gère SES invitations. Le chemin public (le lien, l'acceptation)
-- passe par des routes en service_role : aucune policy anon, volontairement.
drop policy if exists "invitations_structure parrain" on public.invitations_structure;
create policy "invitations_structure parrain" on public.invitations_structure
  for all to authenticated
  using (parrain_profile_id in (select public.mes_studios_staff('equipe_gerer'))
         or parrain_auth_user_id = (select auth.uid()))
  with check (parrain_profile_id in (select public.mes_studios_staff('equipe_gerer'))
              or parrain_auth_user_id = (select auth.uid()));

-- Qui a amené cette structure (le parrainage du lot suivant lit cette colonne).
alter table public.profiles
  add column if not exists parrainee_par uuid references public.profiles(id) on delete set null;

comment on column public.profiles.parrainee_par is
  'Le studio de la prof qui a fait entrer cette structure (pont 1, lot 1 Associations & Studios). Sert au parrainage.';

-- ── Constat ──────────────────────────────────────────────────────────────────
do $$
declare n_membres int; n_inv int;
begin
  select count(*) into n_membres from public.studio_membres;
  select count(*) into n_inv from public.invitations_structure;
  raise notice '✅ v111 : membres décrits + lien permanent, recurrences.intervenant_id, invitations_structure (% membre(s), % invitation(s))', n_membres, n_inv;
end $$;
