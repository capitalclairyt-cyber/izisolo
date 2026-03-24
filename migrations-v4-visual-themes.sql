-- ============================================
-- IziSolo — Migration V4 : Thèmes visuels
-- ============================================
-- Illustration de fond (14 choix + aucun)
-- Valeurs : lotus, mandala, vague, montagne, clef-sol, danseuse, pinceau,
--           meditation, pilates, guitare, micro, bienetre, buddha, ganesh, aucun
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_illustration TEXT DEFAULT 'lotus';

-- Grille décorative 45° (on/off, activée par défaut)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_grille_active BOOLEAN DEFAULT true;

-- Animation de l'arrière-plan (on/off, activée par défaut)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_animation_active BOOLEAN DEFAULT true;

-- Adresse postale du praticien
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adresse TEXT;

-- Lieu principal (FK vers lieux.id) — salle préférée
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lieu_principal UUID REFERENCES lieux(id) ON DELETE SET NULL;

-- Nettoyage des anciennes colonnes (si migration précédente avait été appliquée)
ALTER TABLE profiles DROP COLUMN IF EXISTS ui_motif;
ALTER TABLE profiles DROP COLUMN IF EXISTS ui_opacite_decor;

-- Commentaires
COMMENT ON COLUMN profiles.ui_illustration IS 'Illustration de fond : lotus, mandala, vague, montagne, clef-sol, danseuse, pinceau, meditation, pilates, guitare, micro, bienetre, buddha, ganesh, aucun';
COMMENT ON COLUMN profiles.ui_grille_active IS 'Grille décorative 45° activée (true/false)';
COMMENT ON COLUMN profiles.ui_animation_active IS 'Animation zoom/dézoom de l''arrière-plan activée (true/false)';
COMMENT ON COLUMN profiles.adresse IS 'Adresse postale du praticien';
COMMENT ON COLUMN profiles.lieu_principal IS 'Lieu/salle principal(e) du praticien (FK vers lieux.id)';
