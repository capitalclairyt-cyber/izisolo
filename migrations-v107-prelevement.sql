-- ============================================================
-- MIGRATION v107 — Le prélèvement automatique par carte (abos élèves)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Décision Colin, 2026-09-07, dans la foulée du lot « une facture chaque
-- mois » : le prélèvement récurrent des élèves est INDÉPENDANT de la caisse
-- Stripe SaaS (qui encaisse les profs). Option A validée le 2026-08-19 :
-- la prof crée un Payment Link RÉCURRENT dans SON Stripe et le colle sur
-- l'offre, exactement comme un lien de paiement unique. Pas de Connect, pas
-- de clé API tierce : tout ce qu'IziSolo sait vient des ÉVÉNEMENTS signés.
--
-- Trois colonnes, rien d'autre :
--   • abonnements.stripe_subscription_id : l'abonnement Stripe (sub_…) qui
--     porte cet abo IziSolo — c'est LA clé qui relie chaque prélèvement
--     mensuel (invoice.paid) au bon abo, et qui dit « prélevé auto » aux
--     écrans (badge, pause interdite : Stripe décide, pas nous).
--   • abonnements.stripe_customer_id : le client Stripe (cus_…), pour le jour
--     où la prof cherche l'élève dans son dashboard Stripe.
--   • paiements.stripe_subscription_id : un prélèvement peut ARRIVER AVANT
--     l'événement de checkout qui crée l'abo (Stripe ne garantit pas
--     l'ordre) ; le paiement naît alors orphelin, et le checkout le
--     rattache par cette colonne.
--
-- L'idempotence des prélèvements n'a PAS besoin de colonne neuve : l'id de
-- la facture Stripe (in_…) est stocké dans paiements.stripe_session_id
-- (v12, indexé), « l'objet Stripe qui a produit ce paiement ». Un événement
-- rejoué ne crée donc jamais un second paiement, avant comme après v107.
--
-- Sans cette migration, le code dégrade : le paiement de chaque prélèvement
-- est bien enregistré (l'argent est réel) et rattaché à l'élève par son
-- email, mais l'abo ne sait pas qu'il est prélevé (pas de badge, date de fin
-- non prolongée à chaque cycle). Les UPDATE de ces colonnes sont SÉPARÉS de
-- l'insert (patron poserLienVisio v86) et leur échec est ignoré.
-- ============================================================

alter table public.abonnements
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text;

create index if not exists abonnements_stripe_subscription_idx
  on public.abonnements (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.paiements
  add column if not exists stripe_subscription_id text;

create index if not exists paiements_stripe_subscription_idx
  on public.paiements (stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.abonnements.stripe_subscription_id is
  'v107 : abonnement Stripe (sub_…) prélevé chaque période via le Payment Link récurrent de la prof. Non null = prélèvement auto (lib/prelevement.js).';
comment on column public.paiements.stripe_subscription_id is
  'v107 : abonnement Stripe d''origine d''un prélèvement (invoice.paid), pour rattacher un paiement arrivé avant le checkout. Idempotence = stripe_session_id (id de facture Stripe in_…).';

do $$
begin
  raise notice '✅ v107 : prélèvement automatique prêt (% abo(s) déjà prélevé(s))',
    (select count(*) from public.abonnements where stripe_subscription_id is not null);
end $$;
