-- ════════════════════════════════════════════════════════════════════════════
-- v99 — L'IDENTITÉ VISUELLE DES COURS (2026-08-24, demande Colin)
--
-- Deux niveaux, décidés après sondage de la prod : sur 20 studios réels, 3
-- seulement ont déposé une photo de couverture et 8 n'ont jamais touché leur
-- liste types_cours. Une feature qui repose sur un upload ne toucherait qu'une
-- poignée de profs, d'où le niveau « couleur » qui, lui, marche pour tout le
-- monde sans rien téléverser.
--
--   1. profiles.tons_par_type      {type: 'rose'|'sage'|'sand'|'lavender'|'ink'}
--      La prof CHOISIT la couleur de chaque type. Avant v99, lib/tones.js la
--      déduisait d'un mapping de vocabulaire yoga, avec un repli « première
--      lettre modulo 4 » : Pilates, Danse, Barre ou Sophrologie tombaient sur
--      une couleur arbitraire, sans aucun moyen de la corriger.
--
--   2. profiles.vignettes_par_type {type: url}
--      Une photo par type : 5 dépôts habillent tout le planning, y compris les
--      séances qui n'existent pas encore. Même forme que essai_prix_par_type
--      (v92), même discipline de lecture (lib/vignette-cours.js).
--
--   3. cours.photo_url
--      La photo propre à UNE séance, pour l'atelier ponctuel qui mérite son
--      image (« Yoga Pleine Lune » n'est pas « un cours de Yin »). Elle prime
--      sur celle du type. Portée par la séance et non par la récurrence, parce
--      que les cours ponctuels n'ont pas de ligne dans `recurrences`.
--
-- Re-runnable. Les 3 colonnes naissent NULL = « aucun réglage » (jamais un
-- défaut qui poserait un choix que personne n'a fait, cf. anti-patterns §12).
-- Aucun index : ces colonnes se lisent par profile_id ou par id de cours,
-- jamais en filtre.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tons_par_type      JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vignettes_par_type JSONB;
ALTER TABLE cours    ADD COLUMN IF NOT EXISTS photo_url          TEXT;

COMMENT ON COLUMN profiles.tons_par_type IS
  'v99 — {type_cours: ton} choisi par la prof (rose|sage|sand|lavender|ink). NULL = défauts de lib/tones.js. Lecture UNIQUE via lib/vignette-cours.js.';
COMMENT ON COLUMN profiles.vignettes_par_type IS
  'v99 — {type_cours: url} photo par type de cours (Vercel Blob). NULL = aucune vignette. Lecture UNIQUE via lib/vignette-cours.js.';
COMMENT ON COLUMN cours.photo_url IS
  'v99 — photo propre à CETTE séance (atelier ponctuel), prime sur la vignette de son type. Recopiée par les chemins qui fabriquent une séance depuis une autre.';

-- Contrôle après application :
--   select count(*) filter (where tons_par_type is not null)      as tons,
--          count(*) filter (where vignettes_par_type is not null) as vignettes
--     from profiles;
--   select count(*) filter (where photo_url is not null) as seances_illustrees from cours;
