-- v47 — Position focale de la photo de couverture
--
-- Permet à la prof de choisir quelle zone de sa photo de couverture est
-- visible quand elle est cadrée en format paysage (hero du portail public).
--
-- Valeur en pourcentage vertical (0 = haut, 50 = centre, 100 = bas).
-- Utilisé comme `object-position: 50% {focal_y}%` sur l'image.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_couverture_focal_y INTEGER DEFAULT 50;

COMMENT ON COLUMN profiles.photo_couverture_focal_y IS
  'Position verticale du focal point sur la photo de couverture (0=haut, 50=centre, 100=bas)';
