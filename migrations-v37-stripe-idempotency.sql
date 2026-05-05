-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v37 : table d'idempotency pour les webhooks Stripe
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Audit sécurité 2026-05-05 (I3) : Stripe peut redélivrer un event
-- (timeout HTTP, retry, replay). Sans déduplication, un event
-- `customer.subscription.deleted` rejoué après une nouvelle souscription
-- pourrait downgrader un client payant en 'solo'.
--
-- Cette table stocke les `event.id` Stripe déjà traités. Le webhook
-- `/api/stripe/webhook-saas` interroge cette table avant de traiter et
-- y inscrit après traitement réussi.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.stripe_events_processed (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stripe_events_processed_at_idx
  ON public.stripe_events_processed (processed_at DESC);

-- RLS : aucun accès public, uniquement service role (qui bypass RLS)
ALTER TABLE public.stripe_events_processed ENABLE ROW LEVEL SECURITY;

-- Pas de policy = personne ne peut lire/écrire avec la clé anon.
-- Le webhook utilise SUPABASE_SERVICE_ROLE_KEY qui bypass RLS.

DO $$
BEGIN
  RAISE NOTICE '✅ v37 : stripe_events_processed créée + RLS activée (service role only)';
END $$;
