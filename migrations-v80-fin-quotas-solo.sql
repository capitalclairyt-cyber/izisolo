-- ============================================================================
-- v80 — Fin des quotas Solo (B3a 2026-07-26) : la différenciation des 2 plans
-- est par CAPACITÉS (matrice PLAN-BATAILLE §5), plus par limites de volume.
-- ----------------------------------------------------------------------------
-- Retire des triggers v54 les plafonds « 40 élèves » et « 5 offres » du plan
-- effectif solo. Le code (lib/constantes PLANS) a déjà limiteClients/
-- limiteOffres à null : sans cette migration, un studio Essentiel se
-- heurterait au trigger DB au 41e élève SANS AUCUN avertissement UI
-- (le code ne borne plus) — exactement le genre d'échec muet que la
-- campagne chasse.
--
-- Les triggers de GEL (compte trial_expired/canceled qui ne doit plus rien
-- créer) sont le chantier B3b — on ne touche ici QU'AUX quotas.
--
-- Re-runnable (DROP IF EXISTS).
-- ============================================================================

-- 1. CLIENTS : plafond 40 élèves solo → supprimé
--    (noms EXACTS relevés dans migrations-v54 — un DROP IF EXISTS sur un
--     mauvais nom réussirait en silence et laisserait le quota vivant)
drop trigger if exists trg_check_clients_limit_for_plan on public.clients;
drop function if exists public.check_clients_limit_for_plan();

-- 2. OFFRES : plafond 5 formules solo → supprimé
drop trigger if exists trg_check_offres_limit_for_plan on public.offres;
drop function if exists public.check_offres_limit_for_plan();

-- ON GARDE (conformes à la matrice B3a) :
--   • trg_check_sondages_plan (+ check_sondages_plan) : sondages = capacité
--     Complet, l'enforcement DB reste juste ;
--   • public.plan_effectif(uuid) : utilisée par le trigger sondages et par
--     les futurs triggers de GEL (B3b).
-- NB : le trigger lieux avait déjà été retiré par v66 (lieux illimités pour
-- tous). Après application : `node scripts/verifier-selects.mjs`, puis test
-- réel = créer un 41e élève sur un compte solo effectif.
