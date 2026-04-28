-- Migration v13 : Stripe Payment Link + tracking commission IziSolo
--
-- Architecture :
--   - Chaque pro IziSolo a son propre compte Stripe (PAS de Stripe Connect Mélutek).
--   - Le pro génère un Payment Link sur dashboard.stripe.com et le colle dans son offre.
--   - Le portail élève affiche un bouton "Payer en CB" sur les offres ayant un payment_link.
--   - Stripe envoie un webhook checkout.session.completed à IziSolo
--     → /api/stripe/webhook?profile=<profile_id>
--   - IziSolo vérifie la signature avec le webhook_secret du pro,
--     crée un paiement (statut paid + mode CB + stripe_session_id) et calcule la commission.
--
-- Commission : 1% du montant du paiement (configurable via paiements.commission_taux).
-- Le montant est tracké en DB pour pouvoir l'ajouter à la facture mensuelle SaaS Mélutek
-- (qui sera payée par le pro via Stripe SaaS Mélutek dans un sprint post-launch).
-- Mélutek reste hébergeur logiciel — pas de Stripe Connect, pas de TVA sur commission marchande.

-- ── 1. Champs Stripe sur les offres
alter table public.offres
  add column if not exists stripe_payment_link text;

alter table public.offres
  drop constraint if exists offres_stripe_payment_link_format;

alter table public.offres
  add constraint offres_stripe_payment_link_format
  check (
    stripe_payment_link is null
    or stripe_payment_link ~* '^https?://buy\.stripe\.com/'
    or stripe_payment_link ~* '^https?://[^/]*stripe\.(com|me)(/|$)'
  );

-- ── 2. Configuration Stripe par pro
alter table public.profiles
  add column if not exists stripe_webhook_secret text,
  add column if not exists stripe_account_id text;

-- ── 3. Tracking commission sur les paiements
alter table public.paiements
  add column if not exists commission_taux numeric(5,4) default 0,
  add column if not exists commission_montant numeric(8,2) default 0;

-- ── 4. Idempotence des webhooks (un session_id Stripe ne peut donner qu'un paiement)
create unique index if not exists paiements_stripe_session_unique_idx
  on public.paiements (stripe_session_id)
  where stripe_session_id is not null;

-- ── 5. Index pour calcul rapide des commissions du mois (facturation SaaS)
create index if not exists paiements_commission_idx
  on public.paiements (profile_id, date)
  where commission_montant > 0;
