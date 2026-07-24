-- ════════════════════════════════════════════════════════════════════════
-- v72 — Tranche 3 du filet technique (2026-07-24)
--   1) presences_par_eleve() : agrégat serveur pour les segments de la liste
--      Élèves. Remplace le chargement de TOUTES les présences du studio à
--      chaque affichage de /clients — qui, en plus de la perf, était FAUX
--      au-delà de 1000 présences (plafond PostgREST silencieux → segments
--      « Jamais venu·e » / « Ponctuel·les » arbitraires).
--   2) rate_limits + check_rate_limit() : rate-limit PARTAGÉ entre instances
--      serverless (le compteur mémoire de lib/antibot.js est par instance —
--      illusoire dès que Vercel scale). Clés = sha256(IP salée), jamais d'IP
--      en clair (RGPD). L1 mémoire conservé en court-circuit, ceci est le L2.
--   3) DROP reset_demo_data() : retrait de la démo privée v62 (le code,
--      le cron et l'entrée proxy sont retirés dans le même commit).
--
--   Re-runnable.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Segments élèves : agrégat par client ─────────────────────────────
-- SECURITY INVOKER : la RLS de presences/cours s'applique (la prof ne voit
-- que son studio). LEFT JOIN : une présence sans cours (cours_id null)
-- compte comme un cours « normal » — même sémantique que l'ancien JS.
CREATE OR REPLACE FUNCTION presences_par_eleve()
RETURNS TABLE (
  client_id       uuid,
  nb              integer,
  toutes_tarifees boolean,
  dernier_nom     text,
  dernier_date    text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.client_id,
    count(*)::int                                          AS nb,
    bool_and(coalesce(c.tarif_unitaire, 0) > 0)            AS toutes_tarifees,
    (array_agg(c.nom ORDER BY c.date DESC NULLS LAST)
       FILTER (WHERE coalesce(c.tarif_unitaire, 0) > 0))[1] AS dernier_nom,
    (max(c.date) FILTER (WHERE coalesce(c.tarif_unitaire, 0) > 0))::text AS dernier_date
  FROM presences p
  LEFT JOIN cours c ON c.id = p.cours_id
  WHERE p.profile_id = auth.uid()
    AND p.client_id IS NOT NULL
  GROUP BY p.client_id;
$$;

REVOKE ALL ON FUNCTION presences_par_eleve() FROM public;
GRANT EXECUTE ON FUNCTION presences_par_eleve() TO authenticated;

-- ── 2) Rate-limit partagé ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  cle            text PRIMARY KEY,          -- scope:sha256(ip+sel)
  fenetre_debut  timestamptz NOT NULL DEFAULT now(),
  compteur       integer NOT NULL DEFAULT 1
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Aucune policy : seul service_role y touche (via la RPC ci-dessous).

-- Incrément atomique + reset de fenêtre glissante, en un seul statement
-- (les upserts concurrents se sérialisent sur la ligne). true = requête
-- autorisée, false = quota dépassé.
CREATE OR REPLACE FUNCTION check_rate_limit(p_cle text, p_max integer, p_fenetre_secondes integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compteur integer;
BEGIN
  INSERT INTO rate_limits AS rl (cle, fenetre_debut, compteur)
  VALUES (p_cle, now(), 1)
  ON CONFLICT (cle) DO UPDATE SET
    compteur = CASE
      WHEN rl.fenetre_debut < now() - make_interval(secs => p_fenetre_secondes)
      THEN 1 ELSE rl.compteur + 1 END,
    fenetre_debut = CASE
      WHEN rl.fenetre_debut < now() - make_interval(secs => p_fenetre_secondes)
      THEN now() ELSE rl.fenetre_debut END
  RETURNING compteur INTO v_compteur;
  RETURN v_compteur <= p_max;
END;
$$;

-- Appelée uniquement côté serveur (service_role) : personne d'autre.
REVOKE ALL ON FUNCTION check_rate_limit(text, integer, integer) FROM public;
REVOKE ALL ON FUNCTION check_rate_limit(text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION check_rate_limit(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) TO service_role;

-- ── 3) Retrait de la démo privée (v62) ──────────────────────────────────
DROP FUNCTION IF EXISTS reset_demo_data();

DO $$ BEGIN
  RAISE NOTICE '✅ v72 : presences_par_eleve + rate_limits/check_rate_limit + démo v62 retirée.';
END $$;
