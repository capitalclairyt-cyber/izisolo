-- ============================================================================
-- v118 — « Hors les murs » : le suivi des pistes d'événements de Maude
--
-- Demande Colin (2026-09-14) : un vrai backoffice pour Maude dans l'admin, où
-- chaque lieu qui pourrait accueillir une séance de yoga (grotte, ferme,
-- château, musée, entreprise, EHPAD, gîte) a sa fiche, son mini-projet et un
-- email prêt à partir de SA boîte. Elle relit, demande une modif ou envoie tel
-- quel, puis note où elle en est.
--
-- Le CATALOGUE (fiches, projets, textes) est versionné dans le dépôt
-- (content/hors-les-murs.js) : il change par commit, comme les guides. Ici on
-- ne garde que ce que Maude en FAIT : le statut, le texte s'il a été retouché,
-- son commentaire, la réponse du lieu, la date d'envoi. Une ligne par piste,
-- clé = l'identifiant de la fiche dans le catalogue.
--
-- Sans cette table, la page se rend en lecture (fiches et textes), et chaque
-- geste répond 503 MIGRATION_V118_REQUISE : rien n'est perdu, rien n'est
-- enregistré, et l'écran le dit.
--
-- RLS : aucune policy, service_role seulement (routes admin). Re-runnable.
-- ============================================================================

create table if not exists public.hlm_suivi (
  id            text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  statut        text not null default 'a_relire'
                check (statut in ('a_relire', 'modif_demandee', 'valide', 'envoye', 'repondu', 'en_cours', 'ecarte')),
  objet         text check (char_length(objet) <= 120),
  corps         text check (char_length(corps) <= 4000),
  commentaire   text check (char_length(commentaire) <= 2000),
  reponse       text check (char_length(reponse) <= 2000),
  motif_ecart   text check (motif_ecart is null or motif_ecart in ('pas_le_moment', 'trop_loin', 'refus', 'pas_de_reponse', 'doublon')),
  envoye_at     timestamptz,
  historique    jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.hlm_suivi enable row level security;
-- Aucune policy : seul le service_role (routes /api/admin/hors-les-murs) lit et écrit.

comment on table public.hlm_suivi is 'v118 — où en est Maude avec chaque piste « Hors les murs » (le catalogue vit dans content/hors-les-murs.js)';
