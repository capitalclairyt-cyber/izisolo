-- Migration v7 : paiement différé sur les présences
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE presences
  ADD COLUMN IF NOT EXISTS payer_plus_tard BOOLEAN DEFAULT FALSE;

-- Index pour trouver rapidement les dettes par client
CREATE INDEX IF NOT EXISTS idx_presences_payer_plus_tard
  ON presences (profile_id, client_id, payer_plus_tard)
  WHERE payer_plus_tard = TRUE;

COMMENT ON COLUMN presences.payer_plus_tard IS
  'TRUE quand la professeure a accepté que l''élève paie ce cours ultérieurement';
