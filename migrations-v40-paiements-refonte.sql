-- Migration v40 : Refonte paiements
-- 1. Mise à jour du CHECK constraint (ajout overdue, retrait unpaid/cb)
-- 2. Migration des données existantes
-- 3. Ajout echeancier_id pour grouper les versements

-- Étape 1 : remplacer la contrainte de statut
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_statut_check;
ALTER TABLE paiements ADD CONSTRAINT paiements_statut_check
  CHECK (statut IN ('paid', 'pending', 'overdue'));

-- Étape 2 : migrer les anciens statuts
UPDATE paiements SET statut = 'overdue' WHERE statut = 'unpaid';
UPDATE paiements SET statut = 'paid' WHERE statut = 'cb';

-- Étape 3 : colonne echeancier_id (UUID nullable, pas de FK — juste un groupement)
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS echeancier_id UUID;
CREATE INDEX IF NOT EXISTS idx_paiements_echeancier ON paiements (echeancier_id) WHERE echeancier_id IS NOT NULL;
