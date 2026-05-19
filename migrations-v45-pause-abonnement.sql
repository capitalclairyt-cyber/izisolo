-- v45 — Pause d'abonnement (gel temporaire)
--
-- Permet à un prof de geler un abonnement pendant une période donnée :
--   - L'abonnement n'est plus utilisable pour réserver des cours pendant la pause
--   - La date_fin peut être prolongée automatiquement de la durée de pause (à faire en option)
--
-- Schéma :
--   - Nouveau statut 'gele' dans la contrainte CHECK de abonnements.statut
--   - Colonnes date_pause_debut, date_pause_fin pour tracer la période
--   - notes_pause : raison/note libre

ALTER TABLE abonnements DROP CONSTRAINT IF EXISTS abonnements_statut_check;
ALTER TABLE abonnements ADD CONSTRAINT abonnements_statut_check
  CHECK (statut IN ('actif', 'epuise', 'expire', 'annule', 'gele'));

ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS date_pause_debut DATE;
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS date_pause_fin DATE;
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS notes_pause TEXT;

CREATE INDEX IF NOT EXISTS idx_abonnements_gele ON abonnements(profile_id, statut) WHERE statut = 'gele';
