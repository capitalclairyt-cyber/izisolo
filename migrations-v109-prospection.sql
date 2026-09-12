-- ============================================================================
-- v109 — La prospection à la main, depuis l'admin
--
-- Demande Colin (2026-09-12) : « tu peux me faire un module dédié dans
-- l'admin ? » pour les quelques emails par jour envoyés aux profs (décision du
-- même jour : pas de cold mailing en volume, chaque email écrit pour une
-- personne, signé Maude, depuis bonjour@izisolo.fr).
--
-- Tant que ça vivait dans deux JSON hors dépôt (scripts du matin), seul Colin
-- pouvait tirer, rédiger, envoyer. Maude doit pouvoir le faire depuis capsule,
-- sur son téléphone. Donc les prospects et les emails entrent en base.
--
-- Deux tables :
--   prospects          : une prof (coordonnées publiques d'un annuaire ou de
--                        son site) et où elle en est avec nous ;
--   prospection_emails : les emails qu'on lui a écrits (brouillon, programmé,
--                        envoyé), avec l'id Resend pour pouvoir ANNULER un
--                        envoi programmé avant qu'il parte.
--
-- La réponse se note sur la prof (repondu_at), pas sur l'email : c'est elle
-- qui répond, quel que soit l'email qui l'a décidée.
--
-- RLS : service_role uniquement, comme demandes_studio (v96). Ce sont des
-- coordonnées de tiers, personne d'autre que l'admin ne doit les lire.
--
-- Re-runnable.
-- ============================================================================

create table if not exists public.prospects (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null check (char_length(nom) between 1 and 160),
  prenom        text check (char_length(prenom) <= 80),
  email         text not null check (char_length(email) between 3 and 160),
  ville         text check (char_length(ville) <= 160),
  site          text check (char_length(site) <= 300),
  specialite    text check (char_length(specialite) <= 200),
  source        text not null check (char_length(source) between 1 and 60),
  notes         text check (char_length(notes) <= 4000),

  -- Où elle en est avec nous
  statut        text not null default 'a_contacter'
    check (statut in ('a_contacter', 'en_cours', 'contactee', 'repondu', 'ecartee')),
  motif_ecart   text check (char_length(motif_ecart) <= 60),
  repondu_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.prospects is
  'Profs à démarcher par email, à la main (v109). Coordonnées publiques (annuaire ou site). service_role only.';

-- Une adresse = une prof, quelle que soit sa casse : on ne lui écrit jamais
-- deux fois par erreur d'orthographe.
create unique index if not exists uniq_prospects_email
  on public.prospects (lower(email));
create index if not exists idx_prospects_statut
  on public.prospects (statut, updated_at desc);

create table if not exists public.prospection_emails (
  id            uuid primary key default gen_random_uuid(),
  prospect_id   uuid not null references public.prospects(id) on delete cascade,
  objet         text not null check (char_length(objet) <= 160),
  corps         text not null check (char_length(corps) <= 6000),
  relance       boolean not null default false,
  statut        text not null default 'brouillon'
    check (statut in ('brouillon', 'programme', 'envoye')),
  programme_at  timestamptz,
  envoye_at     timestamptz,
  resend_id     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.prospection_emails is
  'Emails de prospection écrits à la main (v109). resend_id permet d''annuler un envoi programmé. service_role only.';

create index if not exists idx_prospection_emails_prospect
  on public.prospection_emails (prospect_id, created_at desc);
create index if not exists idx_prospection_emails_statut
  on public.prospection_emails (statut, programme_at);

alter table public.prospects enable row level security;
alter table public.prospection_emails enable row level security;
-- Aucune policy, volontairement : seul service_role (l'admin, côté serveur) lit et écrit.
