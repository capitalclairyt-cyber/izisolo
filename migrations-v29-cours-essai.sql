-- Migration v29 : Cours d'essai pour visiteurs
--
-- Permet à un visiteur non-authentifié de demander un cours d'essai en
-- choisissant parmi les cours existants du studio. Le pro configure dans
-- /parametres si la fonctionnalité est active, le mode (auto / semi /
-- manuel), si l'essai est gratuit ou payant sur place.
--
-- Architecture :
--   - profiles.essai_*  : configuration de la fonctionnalité
--   - cours_essai_demandes : journal des demandes (utile en mode manuel
--     pour validation pro, et en mode auto/semi pour traçabilité)
--   - À la validation (auto immédiate / manuel après accept) :
--       1. Créer (si nécessaire) un client avec statut='prospect'
--       2. Insérer une presence sur le cours choisi
--       3. Marquer la demande comme 'finalisee' avec client_id

-- ── 1. Configuration sur profiles ─────────────────────────────────────────
alter table public.profiles
  add column if not exists essai_actif       boolean default false,
  add column if not exists essai_mode        text default 'manuel'
    check (essai_mode in ('auto', 'semi', 'manuel')),
  add column if not exists essai_paiement    text default 'gratuit'
    check (essai_paiement in ('gratuit', 'sur_place', 'stripe')),
  add column if not exists essai_prix        numeric(8,2) default 0
    check (essai_prix >= 0),
  add column if not exists essai_stripe_payment_link text,  -- URL Stripe Payment Link (configuré par le pro)
  add column if not exists essai_message     text default 'Bienvenue ! Je serais ravi·e de t''accueillir pour un cours d''essai.';

comment on column public.profiles.essai_actif is
  'Si true, le visiteur peut demander un cours d''essai depuis /p/[slug].';
comment on column public.profiles.essai_mode is
  'auto = validation immédiate / semi = validation immédiate + notif pro / manuel = validation explicite par le pro requise.';
comment on column public.profiles.essai_paiement is
  'gratuit = pas de paiement / sur_place = à régler le jour du cours / stripe = lien de paiement Stripe (essai_stripe_payment_link requis).';

-- ── 2. Table des demandes d'essai ─────────────────────────────────────────
create table if not exists public.cours_essai_demandes (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  cours_id        uuid not null references public.cours(id) on delete cascade,
  prenom          text not null,
  nom             text,
  email           text not null,
  telephone       text,
  message_visiteur text,    -- "Comment vous nous avez connu", motivation, etc.
  statut          text default 'en_attente'
    check (statut in ('en_attente', 'acceptee', 'refusee', 'finalisee')),
  motif_refus     text,
  client_id       uuid references public.clients(id) on delete set null,
  presence_id     uuid references public.presences(id) on delete set null,
  created_at      timestamptz default now(),
  decided_at      timestamptz
);

create index if not exists essai_demandes_profile_idx
  on public.cours_essai_demandes (profile_id, statut, created_at desc);
create index if not exists essai_demandes_cours_idx
  on public.cours_essai_demandes (cours_id);

alter table public.cours_essai_demandes enable row level security;

-- Pro : CRUD complet sur ses propres demandes
drop policy if exists "Pro CRUD demandes essai" on public.cours_essai_demandes;
create policy "Pro CRUD demandes essai"
  on public.cours_essai_demandes for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Note : le visiteur non-authentifié passe par l'API en service-role pour
-- INSERT (pas de RLS publique nécessaire).

-- ── Vérif ──
do $$
declare n int;
begin
  select count(*) into n
  from information_schema.columns
  where table_name = 'profiles' and column_name like 'essai_%';
  raise notice '✅ % colonnes essai_* sur profiles', n;
end $$;
