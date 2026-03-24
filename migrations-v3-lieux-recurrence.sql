-- ============================================
-- IziSolo — Migration v3 : Lieux, Clients Pro, Récurrence
-- ============================================

-- ============================================
-- 1. LIEUX (salles / adresses du praticien)
-- ============================================
CREATE TABLE lieux (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nom             TEXT NOT NULL,
  adresse         TEXT,
  ville           TEXT,
  notes           TEXT,
  client_pro_id   UUID,  -- NULL = lieu perso, sinon lié à un client pro
  actif           BOOLEAN DEFAULT true,
  ordre           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lieux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRUD lieux" ON lieux FOR ALL USING (profile_id = auth.uid());
CREATE INDEX idx_lieux_profile ON lieux(profile_id);

-- ============================================
-- 2. CLIENTS PRO (associations, studios, entreprises)
-- On réutilise la table clients existante avec un champ type
-- ============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS type_client TEXT DEFAULT 'particulier'
  CHECK (type_client IN ('particulier', 'association', 'studio', 'entreprise', 'autre_pro'));

ALTER TABLE clients ADD COLUMN IF NOT EXISTS nom_structure TEXT;  -- "YogaFacile", "Studio Zen", "Entreprise X"
ALTER TABLE clients ADD COLUMN IF NOT EXISTS siret TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS adresse TEXT;

-- FK : lier les lieux aux clients pro
ALTER TABLE lieux ADD CONSTRAINT fk_lieux_client_pro
  FOREIGN KEY (client_pro_id) REFERENCES clients(id) ON DELETE SET NULL;

-- ============================================
-- 3. RÉCURRENCE DES COURS
-- ============================================

-- Table de modèles récurrents
CREATE TABLE recurrences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nom             TEXT NOT NULL,           -- "Yoga Vinyasa - Lundi 9h"
  type_cours      TEXT,
  heure           TIME,
  duree_minutes   INTEGER DEFAULT 60,
  lieu_id         UUID REFERENCES lieux(id) ON DELETE SET NULL,
  client_pro_id   UUID REFERENCES clients(id) ON DELETE SET NULL,  -- si intervention
  capacite_max    INTEGER,

  -- Pattern de récurrence
  frequence       TEXT NOT NULL CHECK (frequence IN ('quotidien', 'hebdomadaire', 'bimensuel', 'mensuel', 'personnalise')),
  jours_semaine   JSONB DEFAULT '[]',     -- [1,3,5] = lun/mer/ven  (1=lundi...7=dimanche)
  intervalle      INTEGER DEFAULT 1,       -- toutes les N semaines/mois
  jour_mois       INTEGER,                 -- 1-31 pour mensuel

  date_debut      DATE NOT NULL,
  date_fin        DATE,                    -- NULL = pas de fin
  actif           BOOLEAN DEFAULT true,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRUD recurrences" ON recurrences FOR ALL USING (profile_id = auth.uid());
CREATE INDEX idx_recurrences_profile ON recurrences(profile_id);

-- Trigger updated_at
CREATE TRIGGER tr_recurrences_updated
  BEFORE UPDATE ON recurrences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. ENRICHIR LA TABLE COURS
-- ============================================
ALTER TABLE cours ADD COLUMN IF NOT EXISTS lieu_id UUID REFERENCES lieux(id) ON DELETE SET NULL;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS client_pro_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES recurrences(id) ON DELETE SET NULL;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS est_annule BOOLEAN DEFAULT false;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 5. ENRICHIR PROFILES : lieux et types de cours personnalisés
-- Déjà : types_cours JSONB
-- On s'assure que ça marche bien
-- ============================================
-- (types_cours existe déjà dans profiles comme JSONB)
-- On peut ajouter un champ pour les contextes d'intervention
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contextes_intervention JSONB
  DEFAULT '["Personnel", "Association", "Studio partenaire", "Entreprise"]';
