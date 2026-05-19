-- v46 — Restriction par type de cours sur les offres
--
-- Permet à un prof de créer une offre qui ne s'applique qu'à certains types de cours.
-- Exemple : "Carnet Yoga 10 séances" qui ne peut être utilisé que pour des cours
-- de type "Yoga" (pas Pilates ni Méditation).
--
-- Si la colonne est NULL ou vide → l'offre s'applique à tous les types de cours
-- (comportement actuel, rétro-compatible).

ALTER TABLE offres ADD COLUMN IF NOT EXISTS types_cours_autorises TEXT[];

COMMENT ON COLUMN offres.types_cours_autorises IS
  'Liste des types de cours auxquels cette offre donne accès. NULL ou tableau vide = tous les types.';

-- On copie aussi sur abonnements (snapshot à l'achat) pour ne pas dépendre des
-- modifications futures de l'offre.
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS types_cours_autorises TEXT[];
