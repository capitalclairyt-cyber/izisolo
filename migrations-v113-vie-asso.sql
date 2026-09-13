-- ============================================================================
-- IziSolo — v113 : la vie de l'association (2026-09-13)
-- Lot 3 du chantier Associations & Studios (PLAN-ASSOS-STUDIOS-2026.md §5.1).
-- Re-runnable. À appliquer APRÈS v112. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-vie-asso.mjs
-- ----------------------------------------------------------------------------
-- Périmètre borné, décidé par Colin : IziSolo reste l'outil des cours, des
-- adhérentes et de l'argent des cours. On ne devient pas AssoConnect.
--
--   1. `studio_membres.fonction` : le BUREAU = des fonctions (présidente,
--      secrétaire, trésorière, membre du bureau, prof, bénévole), une
--      ÉTIQUETTE qui propose un préréglage de permissions à l'invitation.
--      Jamais un troisième système de droits : ce que la base applique reste
--      `permissions` + `mes_studios_staff(p_perm)` (v101).
--      + la permission `documents` (gérer les documents de la structure),
--      lue par le même helper : aucun changement SQL du helper.
--
--   2. `adhesions` : l'adhésion d'une personne pour une saison. Une TABLE À
--      PART, volontairement : une adhésion ne donne droit à AUCUNE séance, et
--      la ranger dans `abonnements` la ferait résoudre au pointage comme un
--      carnet (v64/v82). Elle se vend depuis la fiche (offre de type
--      `adhesion`), avec son paiement (réglé ou à régler), et son reçu de
--      cotisation est la facture v84 intitulée autrement.
--
--   3. `documents_structure` : statuts, récépissé, règlement intérieur,
--      assurance, agrément, PV d'AG, autre. Une version courante par type,
--      l'historique dessous. Pas de signature électronique.
--
--   4. `assemblees` : date, lieu, ordre du jour, type ; la convocation part par
--      la messagerie aux adhérentes à jour ; la feuille d'émargement s'imprime ;
--      le quorum se compte au jour de l'AG ; le PV est un document rattaché.
--      Pas de vote électronique au premier tour.
--
-- Aucune policy anon : la vie d'une association ne regarde que son équipe.
-- ============================================================================

-- ── 1. Le bureau : des fonctions, pas des droits ─────────────────────────────
alter table public.studio_membres
  add column if not exists fonction text;

alter table public.studio_membres drop constraint if exists studio_membres_fonction_check;
alter table public.studio_membres add constraint studio_membres_fonction_check
  check (fonction is null or fonction in ('presidente', 'secretaire', 'tresoriere', 'membre_bureau', 'prof', 'benevole'));

comment on column public.studio_membres.fonction is
  'Étiquette du bureau (v113) : presidente | secretaire | tresoriere | membre_bureau | prof | benevole. Propose un préréglage de permissions ; les droits appliqués restent `permissions`.';

-- ── 2. Les offres et les adhésions ───────────────────────────────────────────
alter table public.offres drop constraint if exists offres_type_check;
alter table public.offres add constraint offres_type_check
  check (type in ('carnet', 'abonnement', 'cours_unique', 'adhesion'));

create table if not exists public.adhesions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  offre_id      uuid references public.offres(id) on delete set null,
  offre_nom     text not null,
  -- La saison (l'exercice de l'asso), 'AAAA-AAAA' ; ses bornes sont figées.
  saison        text not null,
  date_debut    date not null,
  date_fin      date not null,
  montant       numeric(8,2) not null check (montant >= 0),
  paiement_id   uuid references public.paiements(id) on delete set null,
  statut        text not null default 'active' check (statut in ('active', 'annulee')),
  created_at    timestamptz not null default now(),
  annulee_at    timestamptz,
  -- Une seule adhésion active par personne et par saison.
  unique (client_id, saison)
);

create index if not exists idx_adhesions_profile_saison on public.adhesions (profile_id, saison);

comment on table public.adhesions is
  'L''adhésion d''une personne pour une saison (v113). Ne donne droit à aucune séance : jamais dans `abonnements`, jamais résolue au pointage.';

alter table public.adhesions enable row level security;

drop policy if exists "adhesions lecture" on public.adhesions;
create policy "adhesions lecture" on public.adhesions
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff('eleves_voir')));

drop policy if exists "adhesions ecriture" on public.adhesions;
create policy "adhesions ecriture" on public.adhesions
  for insert to authenticated
  with check (profile_id in (select public.mes_studios_staff('argent_gerer')));

drop policy if exists "adhesions modification" on public.adhesions;
create policy "adhesions modification" on public.adhesions
  for update to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_gerer')))
  with check (profile_id in (select public.mes_studios_staff('argent_gerer')));

-- L'élève lit SES adhésions (bras élève, helper v91 : ses fiches).
drop policy if exists "Eleve lit ses adhesions" on public.adhesions;
create policy "Eleve lit ses adhesions" on public.adhesions
  for select to authenticated
  using (client_id in (select public.mes_client_ids()));

-- ── 3. Les documents de la structure ─────────────────────────────────────────
create table if not exists public.documents_structure (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('statuts', 'recepisse', 'reglement_interieur', 'assurance', 'agrement', 'pv_ag', 'contrat', 'autre')),
  titre          text not null,
  url            text not null,
  date_document  date,
  -- Rattachement facultatif : le PV d'une AG, le contrat d'une intervenante.
  assemblee_id   uuid,
  membre_id      uuid references public.studio_membres(id) on delete set null,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_documents_structure_profile on public.documents_structure (profile_id, type, created_at desc);

alter table public.documents_structure enable row level security;

-- Lire = toute l'équipe active ; écrire = la permission `documents`.
drop policy if exists "documents lecture" on public.documents_structure;
create policy "documents lecture" on public.documents_structure
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "documents ecriture" on public.documents_structure;
create policy "documents ecriture" on public.documents_structure
  for insert to authenticated
  with check (profile_id in (select public.mes_studios_staff('documents')));

drop policy if exists "documents suppression" on public.documents_structure;
create policy "documents suppression" on public.documents_structure
  for delete to authenticated
  using (profile_id in (select public.mes_studios_staff('documents')));

-- ── 4. Les assemblées générales ──────────────────────────────────────────────
create table if not exists public.assemblees (
  id                      uuid primary key default gen_random_uuid(),
  profile_id              uuid not null references public.profiles(id) on delete cascade,
  type                    text not null default 'ordinaire' check (type in ('ordinaire', 'extraordinaire')),
  titre                   text,
  date                    date not null,
  heure                   time,
  lieu                    text,
  ordre_du_jour           text,
  statut                  text not null default 'a_venir' check (statut in ('a_venir', 'tenue', 'annulee')),
  convocation_envoyee_at  timestamptz,
  convoques               integer,
  presentes               integer,
  pouvoirs                integer,
  pv_document_id          uuid references public.documents_structure(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_assemblees_profile on public.assemblees (profile_id, date desc);

alter table public.assemblees enable row level security;

drop policy if exists "assemblees lecture" on public.assemblees;
create policy "assemblees lecture" on public.assemblees
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "assemblees ecriture" on public.assemblees;
create policy "assemblees ecriture" on public.assemblees
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff('documents')))
  with check (profile_id in (select public.mes_studios_staff('documents')));

drop trigger if exists tr_assemblees_updated on public.assemblees;
create trigger tr_assemblees_updated before update on public.assemblees
  for each row execute function public.update_updated_at();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documents_structure_assemblee_id_fkey') then
    alter table public.documents_structure
      add constraint documents_structure_assemblee_id_fkey
      foreign key (assemblee_id) references public.assemblees(id) on delete set null;
  end if;
end $$;

-- ── Constat ──────────────────────────────────────────────────────────────────
do $$
declare n_adh int; n_doc int; n_ag int;
begin
  select count(*) into n_adh from public.adhesions;
  select count(*) into n_doc from public.documents_structure;
  select count(*) into n_ag from public.assemblees;
  raise notice '✅ v113 : fonction du bureau, offres.type adhesion, adhesions (%), documents_structure (%), assemblees (%)', n_adh, n_doc, n_ag;
end $$;
