-- Migration v40 : Refonte paiements
-- IMPORTANT : migrer les données AVANT de remettre la contrainte

-- Étape 1 : supprimer l'ancienne contrainte
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_statut_check;

-- Étape 2 : migrer les anciens statuts (pendant qu'il n'y a pas de contrainte)
UPDATE paiements SET statut = 'overdue' WHERE statut = 'unpaid';
UPDATE paiements SET statut = 'paid' WHERE statut = 'cb';

-- Étape 3 : remettre la contrainte avec les nouveaux statuts
ALTER TABLE paiements ADD CONSTRAINT paiements_statut_check
  CHECK (statut IN ('paid', 'pending', 'overdue'));

-- Étape 4 : colonne echeancier_id (UUID nullable, groupement de versements)
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS echeancier_id UUID;
CREATE INDEX IF NOT EXISTS idx_paiements_echeancier ON paiements (echeancier_id) WHERE echeancier_id IS NOT NULL;
