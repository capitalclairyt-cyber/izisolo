-- ============================================================
-- NETTOYAGE DES CLIENTS EN DOUBLON
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================
-- ÉTAPE 1 : Diagnostic — voir les doublons avant de toucher quoi que ce soit
-- ============================================================

SELECT
  profile_id,
  LOWER(TRIM(nom))    AS nom_norm,
  LOWER(TRIM(prenom)) AS prenom_norm,
  COUNT(*)            AS nb_occurrences,
  ARRAY_AGG(id ORDER BY created_at ASC) AS ids  -- le 1er = celui qu'on garde
FROM clients
GROUP BY profile_id, LOWER(TRIM(nom)), LOWER(TRIM(prenom))
HAVING COUNT(*) > 1
ORDER BY nb_occurrences DESC, nom_norm;


-- ============================================================
-- ÉTAPE 2 : Aperçu détaillé des lignes qui seront SUPPRIMÉES
-- (toutes sauf la plus ancienne de chaque groupe)
-- ============================================================

SELECT c.*
FROM clients c
WHERE c.id NOT IN (
  -- On garde le premier inséré (created_at le plus ancien) de chaque groupe
  SELECT DISTINCT ON (profile_id, LOWER(TRIM(nom)), LOWER(TRIM(prenom)))
    id
  FROM clients
  ORDER BY profile_id, LOWER(TRIM(nom)), LOWER(TRIM(prenom)), created_at ASC
)
ORDER BY LOWER(TRIM(nom)), created_at;


-- ============================================================
-- ÉTAPE 3 : SUPPRESSION des doublons (garde le plus ancien)
-- ⚠️  Exécute d'abord les étapes 1 et 2 pour vérifier !
-- ============================================================

DELETE FROM clients
WHERE id NOT IN (
  SELECT DISTINCT ON (profile_id, LOWER(TRIM(nom)), LOWER(TRIM(prenom)))
    id
  FROM clients
  ORDER BY profile_id, LOWER(TRIM(nom)), LOWER(TRIM(prenom)), created_at ASC
);


-- ============================================================
-- ÉTAPE 4 : Vérification post-suppression
-- ============================================================

-- Aucune ligne ne doit apparaître ici si tout est propre
SELECT
  profile_id,
  LOWER(TRIM(nom))    AS nom_norm,
  LOWER(TRIM(prenom)) AS prenom_norm,
  COUNT(*)            AS nb
FROM clients
GROUP BY profile_id, LOWER(TRIM(nom)), LOWER(TRIM(prenom))
HAVING COUNT(*) > 1;


-- ============================================================
-- ÉTAPE 5 (optionnel) : Ajouter une contrainte UNIQUE pour
-- empêcher les doublons côté base à l'avenir
-- ============================================================

-- Crée un index unique insensible à la casse sur (profile_id, nom, prenom)
-- À n'exécuter qu'une fois la base propre (après l'étape 3)
CREATE UNIQUE INDEX IF NOT EXISTS clients_unique_nom_prenom
  ON clients (profile_id, LOWER(TRIM(nom)), LOWER(TRIM(prenom)));
