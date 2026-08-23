-- ============================================================================
-- v96 — « On crée ton studio » : le guichet public de la création concierge
--
-- Demande Colin (2026-08-23, feedback in-app du 04:34) : « on fait un
-- formulaire sur notre site "on crée ton studio" sous 48 h avec nom, mail,
-- infos, csv, offres etc puis on envoie, Maude ou moi, par mail directement
-- depuis l'admin le studio une fois créé. Il faut que ce soit bien visible
-- sur la landing ».
--
-- Le moteur existe déjà (création concierge du 2026-08-21 :
-- /admin/studios/nouveau + lien d'appropriation). Il lui manquait sa PORTE
-- D'ENTRÉE publique et, surtout, un endroit où les demandes ATTERRISSENT.
-- Leçon des feedbacks v41 : ce qui n'a pas d'écran d'arrivée se perd.
--
-- ⚠️ CE QUE LA TABLE NE CONTIENT PAS, VOLONTAIREMENT : aucune liste d'élèves.
-- Un CSV de tiers déposé sur un formulaire public par une personne non
-- authentifiée, c'est de la donnée personnelle collectée sans base légale
-- solide et sans canal sûr. La liste est réclamée APRÈS, par l'email de
-- réponse (canal identifié, sans obligation), ou importée par la prof
-- elle-même une fois son studio ouvert.
--
-- Re-runnable.
-- ============================================================================

create table if not exists public.demandes_studio (
  id uuid primary key default gen_random_uuid(),

  -- Qui demande
  prenom        text not null check (char_length(prenom) between 1 and 80),
  nom           text check (char_length(nom) <= 80),
  email         text not null check (char_length(email) between 3 and 160),
  telephone     text check (char_length(telephone) <= 40),

  -- Son activité, de quoi construire le studio
  studio_nom    text check (char_length(studio_nom) <= 120),
  activite      text check (char_length(activite) <= 60),
  ville         text check (char_length(ville) <= 120),
  site_web      text check (char_length(site_web) <= 300),
  planning      text check (char_length(planning) <= 4000),
  offres        text check (char_length(offres) <= 4000),
  message       text check (char_length(message) <= 4000),

  -- Vie de la demande
  statut        text not null default 'nouvelle'
    check (statut in ('nouvelle', 'en_cours', 'creee', 'sans_suite')),
  admin_note    text,
  profile_id    uuid references public.profiles(id) on delete set null,
  traitee_at    timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.demandes_studio is
  'Demandes publiques « créez mon studio » (v96). Aucune liste d''élèves ici : elle est réclamée par email, canal identifié.';

create index if not exists idx_demandes_studio_statut
  on public.demandes_studio (statut, created_at desc);

-- RLS : service_role uniquement. La route publique insère via le client admin
-- (après antibot), l'admin lit via le client admin. Aucune policy pour anon ni
-- authenticated : personne ne doit pouvoir lire les coordonnées des autres.
alter table public.demandes_studio enable row level security;
