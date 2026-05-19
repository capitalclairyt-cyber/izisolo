-- Migration v44 : Cours à domicile
-- Ajoute domicile (bool), client_id (FK), frais_deplacement sur cours et recurrences

-- ── Table cours ──────────────────────────────────────────────────────────────
ALTER TABLE cours ADD COLUMN IF NOT EXISTS domicile BOOLEAN DEFAULT false;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS frais_deplacement DECIMAL(8,2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_cours_domicile ON cours(profile_id) WHERE domicile = true;
CREATE INDEX IF NOT EXISTS idx_cours_client_id ON cours(client_id) WHERE client_id IS NOT NULL;

-- ── Table recurrences (pour propager aux cours générés) ─────────────────────
ALTER TABLE recurrences ADD COLUMN IF NOT EXISTS domicile BOOLEAN DEFAULT false;
ALTER TABLE recurrences ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE recurrences ADD COLUMN IF NOT EXISTS frais_deplacement DECIMAL(8,2) DEFAULT NULL;
