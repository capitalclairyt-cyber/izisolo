-- ============================================================
-- MIGRATION v71 — Journal d'erreurs applicatives (remplaçant Sentry)
-- ============================================================
--
-- Contexte (2026-07-25) : le compte Sentry n'existe plus. Le sweep
-- `reportError` (commit 56277b7) capture les erreurs des 46 routes API,
-- mais sans destination. Cette table devient le puits : chaque reportError
-- serveur y écrit une ligne (fire-and-forget, jamais bloquant), et
-- /admin/erreurs les affiche. Zéro vendor, zéro coût.
--
-- - RLS activée SANS policy → seul service_role écrit/lit (l'admin lit via
--   createAdminClient, comme le reste de l'espace admin).
-- - Purge : le cron `expirations` supprime les lignes de plus de 30 jours.
-- - Si cette migration n'est pas appliquée, reportError dégrade proprement
--   (console.error reste, l'insert échoue en silence).
--
-- Re-runnable.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.erreurs_app (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  message     text NOT NULL,
  stack       text,
  contexte    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_erreurs_app_created ON public.erreurs_app (created_at DESC);

ALTER TABLE public.erreurs_app ENABLE ROW LEVEL SECURITY;
-- Aucune policy : accès service_role uniquement (routes serveur + admin).

DO $$ BEGIN
  RAISE NOTICE '✅ v71 : table erreurs_app prête (journal d''erreurs applicatives).';
END $$;
