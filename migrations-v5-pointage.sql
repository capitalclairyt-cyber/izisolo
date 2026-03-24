-- ============================================================
-- IziSolo — Migration v5 : Pointage avancé
-- Ajoute 4 états de présence + règles d'annulation par profil
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Nouveaux champs sur la table presences
-- ────────────────────────────────────────────────────────────

-- Statut de pointage (remplace le simple booléen pointee)
--   inscrit  → inscrit, pas encore traité (défaut)
--   present  → présent au cours
--   absent   → absent, non justifié
--   excuse   → absent mais excuse acceptée
ALTER TABLE presences
  ADD COLUMN IF NOT EXISTS statut_pointage TEXT
    DEFAULT 'inscrit'
    CHECK (statut_pointage IN ('inscrit', 'present', 'absent', 'excuse'));

-- Motif de l'absence (optionnel, saisi par la prof)
ALTER TABLE presences
  ADD COLUMN IF NOT EXISTS motif_absence TEXT;

-- Synchroniser les données existantes : pointee=true → present
UPDATE presences
  SET statut_pointage = 'present'
  WHERE pointee = true AND statut_pointage = 'inscrit';

-- ────────────────────────────────────────────────────────────
-- 2. Règles d'annulation dans le profil
-- ────────────────────────────────────────────────────────────
-- Structure JSON :
-- {
--   "delai_heures": 24,          ← délai global avant le cours
--   "politique": "excuse_si_delai",
--   "message": "Annulation acceptée jusqu'à 24h avant le cours",
--   "regles_par_type": {
--     "Yoga Prénatal": { "delai_heures": 48 },
--     "Stage":         { "delai_heures": 72 }
--   }
-- }
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS regles_annulation JSONB
    DEFAULT '{
      "delai_heures": 24,
      "politique": "excuse_si_delai",
      "message": "Annulation acceptée jusqu''à 24h avant le cours",
      "regles_par_type": {}
    }';
