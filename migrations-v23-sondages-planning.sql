-- Migration v23 : Sondages "Planning idéal"
--
-- Le pro propose 3-8 créneaux candidats à ses élèves (et visiteurs anonymes).
-- Chaque répondant vote oui / peut-être / non par créneau, avec commentaire optionnel.
-- Le pro voit les résultats agrégés et peut convertir 1-clic en série récurrente.
--
-- Tables :
--   sondages_planning   : un sondage = un projet de planning (titre, message, deadline)
--   sondages_creneaux   : les 3-8 créneaux soumis au vote (jour + heure + type cours)
--   sondages_reponses   : les votes individuels (1 par créneau × répondant)
--
-- Anti-doublon :
--   - répondant inscrit  → UNIQUE (creneau_id, client_id)
--   - répondant anonyme  → UNIQUE (creneau_id, lower(email))
--
-- Anti-bot : géré côté API (honeypot + rate limit), pas en DB.

-- ── 1. Table sondages_planning ──────────────────────────────────────────────
create table if not exists public.sondages_planning (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid references public.profiles(id) on delete cascade not null,
  slug              text not null unique,        -- public URL : /p/[studioSlug]/sondage/[slug]
  titre             text not null,
  message           text,                         -- intro affichée aux répondants
  date_fin          date,                         -- au-delà : sondage clos (réponses bloquées)
  visibilite        text not null default 'mixte' check (visibilite in ('inscrits', 'mixte', 'public')),
  -- inscrits = élèves connectés uniquement | mixte = inscrits OU email | public = lien partageable
  actif             boolean default true,
  created_at        timestamptz default now(),
  closed_at         timestamptz                   -- set quand le pro clôt manuellement
);

create index if not exists sondages_planning_profile_idx
  on public.sondages_planning (profile_id, created_at desc);

alter table public.sondages_planning enable row level security;

create policy "Pro CRUD ses sondages"
  on public.sondages_planning for all
  using (profile_id = auth.uid());

-- Lecture publique (pour la page de réponse) — uniquement si actif
create policy "Public lit sondages actifs"
  on public.sondages_planning for select
  using (actif = true and (date_fin is null or date_fin >= current_date));

-- ── 2. Table sondages_creneaux ──────────────────────────────────────────────
create table if not exists public.sondages_creneaux (
  id                uuid primary key default gen_random_uuid(),
  sondage_id        uuid references public.sondages_planning(id) on delete cascade not null,
  type_cours        text not null,
  jour_semaine      int not null check (jour_semaine between 1 and 7),  -- 1=lundi
  heure             time not null,
  duree_minutes     int default 60,
  ordre             int default 0,
  notes             text,
  created_at        timestamptz default now()
);

create index if not exists sondages_creneaux_sondage_idx
  on public.sondages_creneaux (sondage_id, ordre);

alter table public.sondages_creneaux enable row level security;

create policy "Pro CRUD ses creneaux"
  on public.sondages_creneaux for all
  using (sondage_id in (select id from public.sondages_planning where profile_id = auth.uid()));

create policy "Public lit creneaux des sondages actifs"
  on public.sondages_creneaux for select
  using (sondage_id in (
    select id from public.sondages_planning
    where actif = true and (date_fin is null or date_fin >= current_date)
  ));

-- ── 3. Table sondages_reponses ──────────────────────────────────────────────
create table if not exists public.sondages_reponses (
  id                uuid primary key default gen_random_uuid(),
  creneau_id        uuid references public.sondages_creneaux(id) on delete cascade not null,
  client_id         uuid references public.clients(id) on delete set null,
  email             text,                         -- normalisé en lowercase côté API
  prenom            text,
  valeur            text not null check (valeur in ('oui', 'peut_etre', 'non')),
  commentaire       text,
  ip_hash           text,                         -- hash SHA-256 d'IP+sel pour rate-limit (pas du clair)
  created_at        timestamptz default now()
);

-- Anti-doublon : 1 réponse max par (creneau, client) ou (creneau, email)
create unique index if not exists sondages_rep_creneau_client_uq
  on public.sondages_reponses (creneau_id, client_id)
  where client_id is not null;

create unique index if not exists sondages_rep_creneau_email_uq
  on public.sondages_reponses (creneau_id, lower(email))
  where email is not null and client_id is null;

create index if not exists sondages_rep_creneau_idx
  on public.sondages_reponses (creneau_id);

alter table public.sondages_reponses enable row level security;

-- Pro lit les réponses de ses propres sondages
create policy "Pro lit reponses ses sondages"
  on public.sondages_reponses for select
  using (creneau_id in (
    select c.id from public.sondages_creneaux c
    join public.sondages_planning s on s.id = c.sondage_id
    where s.profile_id = auth.uid()
  ));

-- L'insert se fait via API server-side (service role key) pour gérer
-- l'anonyme + le rate-limit + le honeypot. Donc pas de policy INSERT publique.
-- Pas besoin de policy delete : seul le pro peut nettoyer en service role
-- ou via cascade depuis sondages_planning.

comment on table public.sondages_planning is
  'Sondages de planning idéal : le pro propose des créneaux candidats, élèves/visiteurs votent oui/peut-être/non.';
comment on column public.sondages_planning.visibilite is
  'Qui peut voter : inscrits (auth uniquement) | mixte (auth OU email) | public (lien partageable).';
comment on column public.sondages_reponses.ip_hash is
  'SHA-256(ip + secret) pour rate-limit anonyme. Pas de stockage IP en clair (RGPD).';
