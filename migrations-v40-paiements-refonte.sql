-- Migration v40 : Refonte paiements
-- 1. Ajout echeancier_id pour grouper les versements
-- 2. Nettoyage des statuts : unpaid → overdue, cb → paid

-- Ajout colonne echeancier_id (UUID nullable, pas de FK — juste un groupement)
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS echeancier_id UUID;

-- Index pour requêter les versements d'un même échéancier
CREATE INDEX IF NOT EXISTS idx_paiements_echeancier ON paiements (echeancier_id) WHERE echeancier_id IS NOT NULL;

-- Migration des anciens statuts
UPDATE paiements SET statut = 'overdue' WHERE statut = 'unpaid';
UPDATE paiements SET statut = 'paid' WHERE statut = 'cb';
