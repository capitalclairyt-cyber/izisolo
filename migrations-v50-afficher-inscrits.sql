-- ============================================================================
-- v50 — Portail public : afficher ou non la jauge d'inscrits / places
-- ============================================================================
-- Certaines profs préfèrent ne pas exposer publiquement le nombre d'inscrits
-- (0 ou 1 inscrit peut gêner). Ce toggle masque la jauge "X places / X inscrits"
-- sur le portail public — le badge "Complet" reste toujours affiché (utile).
--
-- Défaut = true : comportement actuel préservé pour les studios existants.
-- À appliquer manuellement via Supabase → SQL Editor AVANT le déploiement du code
-- (le portail sélectionne cette colonne ; sans elle, la requête échoue).
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS afficher_inscrits boolean NOT NULL DEFAULT true;
