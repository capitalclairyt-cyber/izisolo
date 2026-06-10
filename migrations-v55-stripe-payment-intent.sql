-- ============================================================
-- MIGRATION v55 — Rattachement des remboursements Stripe (Sprint 5)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Problème : charge.refunded fournit un payment_intent (pi_…) que
-- l'ancien code comparait à stripe_session_id (cs_…) → aucun
-- remboursement n'a jamais été répercuté dans IziSolo.
-- Fix : on stocke le payment_intent à l'encaissement, le webhook
-- refund matche dessus (fallback legacy : stripe_session_id).
-- ============================================================

alter table public.paiements
  add column if not exists stripe_payment_intent text;

create index if not exists idx_paiements_stripe_pi
  on public.paiements (stripe_payment_intent)
  where stripe_payment_intent is not null;
