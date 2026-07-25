-- ════════════════════════════════════════════════════════════════════════
-- v77 — Le CHECK channel de notifications_eleves n'autorisait pas 'push'
--        (audit B1g 2026-07-25, prouvé par sonde : INSERT push → 23514)
--
--   v19 a créé la table avec CHECK (channel IN ('email','sms')). v59 a
--   ensuite branché le Web Push, et `claimCronPush` (lib/push-server)
--   déduplique les push de crons en insérant channel='push' dans CETTE
--   table : l'insert était rejeté en 23514, interprété « déjà poussé »
--   → TOUS les push de crons élèves (rappel de séance J-1, crédits
--   faibles, expiration d'abonnement) sont morts en silence depuis v59.
--   Le fix « studio_slug dans les URLs push » (lot E) n'a jamais pu avoir
--   d'effet observable.
--
--   Côté code (même lot) : claimCronPush distingue désormais 23505 (doublon
--   normal) des autres erreurs, qui remontent au radar erreurs_app.
--
--   Re-runnable. Après application : node scripts/verifier-selects.mjs.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.notifications_eleves
  DROP CONSTRAINT IF EXISTS notifications_eleves_channel_check;

ALTER TABLE public.notifications_eleves
  ADD CONSTRAINT notifications_eleves_channel_check
  CHECK (channel IN ('email', 'sms', 'push'));

DO $$ BEGIN
  RAISE NOTICE '✅ v77 : channel ''push'' accepté — les push de crons élèves peuvent enfin partir.';
END $$;
