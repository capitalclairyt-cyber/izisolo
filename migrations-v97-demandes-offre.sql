-- ============================================================================
-- v97 — L'élève demande une offre, la prof valide et encaisse
--
-- Demande Colin (2026-08-23) : « il faut aussi que les élèves puissent voir
-- les offres dispo du studio et faire une demande, la prof valide ensuite de
-- son côté et gère le paiement ».
--
-- LE TROU : la boucle commerce élève n'existait QUE par Stripe. Une offre sans
-- Payment Link n'apparaissait nulle part côté élève (l'espace ne listait que
-- les offres `stripe_payment_link IS NOT NULL`), et la grille du portail se
-- contentait d'AFFICHER des prix sans rien permettre. Résultat : une prof en
-- Essentiel, ou une prof qui encaisse en chèque au cours suivant, n'avait
-- aucun moyen de recevoir une intention d'achat. C'est la leçon Kim écrite en
-- toutes lettres dans la bible : ce qui n'est pas visible n'existe pas
-- commercialement.
--
-- LE MODÈLE : la demande n'est PAS une vente. Elle ne crée ni abonnement ni
-- paiement, elle ne réserve rien, elle ne promet rien à l'élève. C'est une
-- intention, que la prof transforme en vente par le tunnel existant (où elle
-- choisit payé maintenant / à régler plus tard / en plusieurs fois). Séparer
-- les deux, c'est ce qui permet d'encaisser en espèces, en chèque, ou en trois
-- fois, sans qu'IziSolo ait à connaître l'argent avant qu'il arrive.
--
-- client_id NULLABLE : une prospecte qui n'a pas encore de fiche peut demander
-- depuis la grille publique (prénom + email suffisent). La prof crée la fiche
-- au moment de la vente, comme aujourd'hui.
--
-- Re-runnable.
-- ============================================================================

create table if not exists public.demandes_offre (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  offre_id   uuid not null references public.offres(id) on delete cascade,

  -- Qui demande : une fiche existante, ou de simples coordonnées.
  client_id  uuid references public.clients(id) on delete set null,
  prenom     text check (char_length(prenom) <= 80),
  nom        text check (char_length(nom) <= 80),
  email      text check (char_length(email) <= 160),
  message    text check (char_length(message) <= 1000),

  statut     text not null default 'nouvelle'
    check (statut in ('nouvelle', 'acceptee', 'refusee')),
  traitee_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.demandes_offre is
  'Intentions d''achat d''élèves (v97). Ni vente ni réservation : la prof valide et encaisse par le tunnel de vente existant.';

create index if not exists idx_demandes_offre_profil
  on public.demandes_offre (profile_id, statut, created_at desc);

-- Une seule demande EN ATTENTE par (offre, demandeur) : re-cliquer trois fois
-- ne doit pas fabriquer trois demandes à traiter. Deux index partiels, l'un
-- pour les fiches connues, l'autre pour les coordonnées libres.
create unique index if not exists uniq_demande_offre_client_en_attente
  on public.demandes_offre (offre_id, client_id)
  where statut = 'nouvelle' and client_id is not null;

create unique index if not exists uniq_demande_offre_email_en_attente
  on public.demandes_offre (offre_id, lower(email))
  where statut = 'nouvelle' and client_id is null and email is not null;

alter table public.demandes_offre enable row level security;

-- La prof lit et traite les siennes. L'écriture publique passe par la route
-- (client admin, après antibot) : une élève ne doit pas pouvoir écrire
-- directement dans la file d'attente d'une prof.
drop policy if exists "demandes_offre_prof_select" on public.demandes_offre;
create policy "demandes_offre_prof_select" on public.demandes_offre
  for select to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "demandes_offre_prof_update" on public.demandes_offre;
create policy "demandes_offre_prof_update" on public.demandes_offre
  for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
