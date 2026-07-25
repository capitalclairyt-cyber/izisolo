-- Migration v6 : type_presence sur les présences + essais_par_defaut sur les profils
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE presences
  ADD COLUMN IF NOT EXISTS type_presence TEXT
  DEFAULT 'normal'
  CHECK (type_presence IN ('normal', 'essai', 'offert'));

-- Permet de configurer le nombre de cours d'essai autorisés par défaut
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS essais_par_defaut INT DEFAULT 1;

-- Index pour les requêtes sur type_presence
CREATE INDEX IF NOT EXISTS idx_presences_type_presence
  ON presences (profile_id, type_presence);

COMMENT ON COLUMN presences.type_presence IS
  'normal = séance standard | essai = cours d''essai gratuit | offert = séance offerte par la professeure';
