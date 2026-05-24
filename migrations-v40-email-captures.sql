-- ============================================================
-- v40 — Email captures pour les lead magnets et outils gratuits
-- ============================================================
-- À exécuter dans Supabase SQL Editor.
-- Indexe par email (unique), source (filtrage), ip (rate limit),
-- created_at (purges futures).

create table if not exists email_captures (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  source       text not null,           -- ex: 'outils.calculateur-revenu' / 'blog' / etc.
  ip_hash      text,                    -- hash SHA-256 de l'IP (RGPD-friendly, pas de stockage IP claire)
  user_agent   text,                    -- pour analyse anti-bot ultérieure
  honeypot_ok  boolean default true,    -- false si bot pris dans le honeypot
  time_to_submit_ms int,                -- temps entre ouverture page et submit (anti-bot)
  unsubscribed boolean default false,
  created_at   timestamptz default now()
);

create unique index if not exists email_captures_email_unique
  on email_captures (email);

create index if not exists email_captures_source
  on email_captures (source);

create index if not exists email_captures_ip_hash_created_at
  on email_captures (ip_hash, created_at desc);

create index if not exists email_captures_created_at
  on email_captures (created_at desc);

-- RLS : pas d'accès direct côté client, tout passe par l'API server-side
alter table email_captures enable row level security;

-- Policy : aucun accès anon, seul le service_role peut écrire/lire
-- (l'API /api/leads utilise service_role via le serveur)

comment on table email_captures is
  'Captures email des lead magnets et outils gratuits. RGPD : pas d''IP claire stockée (hash SHA-256), unsubscribe en 1 clic.';
