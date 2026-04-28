-- Migration v12 : Améliorations compta paiements
-- - date_encaissement : pour distinguer date de réception (chèque reçu le 5)
--   de la date d'encaissement effective (chèque déposé/encaissé le 20)
-- - stripe_session_id : préparation Stripe Payment Link (v13 ajoutera l'UI côté offres)
--   Permet de matcher les webhooks Stripe checkout.session.completed sur le bon paiement.

alter table public.paiements
  add column if not exists date_encaissement date,
  add column if not exists stripe_session_id text;

create index if not exists paiements_stripe_session_idx
  on public.paiements (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists paiements_date_encaissement_idx
  on public.paiements (date_encaissement)
  where date_encaissement is not null;

-- Backfill : pour les paiements déjà 'paid', date_encaissement = date
update public.paiements
  set date_encaissement = date
  where statut = 'paid'
    and date_encaissement is null;
