-- ============================================================
-- MIGRATION v52 — Journal des emails envoyés (dédup digest & co)
-- À exécuter dans le SQL Editor Supabase.
--
-- Sprint 0 audit technique (2026-06-10) :
--   • dédup du cron digest-messagerie : un re-run du cron ne
--     double-envoie plus (claim avant envoi, libéré si échec)
--   • servira de base au sendEmail() central du Sprint 5
--
-- Le code est FAIL-OPEN : tant que cette table n'existe pas,
-- le digest fonctionne comme avant (sans dédup) avec un warn
-- dans les logs.
-- ============================================================

create table if not exists emails_envoyes (
  id uuid primary key default gen_random_uuid(),
  type text not null,            -- ex : 'digest_messagerie'
  destinataire text not null,    -- email destinataire (lowercase)
  ref text not null default '',  -- contexte de dédup (ex : date du digest 'YYYY-MM-DD')
  created_at timestamptz not null default now()
);

-- Une seule ligne par (type, destinataire, ref) → conflit = déjà envoyé
create unique index if not exists emails_envoyes_dedup
  on emails_envoyes (type, destinataire, ref);

-- Purge facile des vieux marqueurs (maintenance future)
create index if not exists emails_envoyes_created_at
  on emails_envoyes (created_at);

-- RLS activée sans aucune policy = lisible/inscriptible UNIQUEMENT
-- par le service_role (crons). Ni anon ni authenticated n'y accèdent.
alter table emails_envoyes enable row level security;
