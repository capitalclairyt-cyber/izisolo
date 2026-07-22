-- ════════════════════════════════════════════════════════════════════════
-- v69 — Toggle « Afficher les horaires du studio » (page publique)
--
--   Avant : les horaires s'affichaient sur le portail dès que horaires_studio
--   était renseigné (pas de choix). Désormais la prof choisit ; défaut = NON.
--
--   Backfill : les profs qui ont DÉJÀ des horaires renseignés les gardent
--   affichés (afficher_horaires = true) — on ne veut pas les faire disparaître.
--   Les nouveaux profils partent à false (défaut).
--
--   Re-runnable.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS afficher_horaires boolean DEFAULT false;

-- Respecte l'existant : ceux qui ont déjà des horaires restent affichés.
UPDATE profiles
   SET afficher_horaires = true
 WHERE afficher_horaires IS DISTINCT FROM true
   AND coalesce(horaires_studio, '') <> '';
