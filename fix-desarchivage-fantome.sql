-- ============================================================================
-- FIX one-shot — Désarchivage des fiches élèves archivées à tort (2026-07-23)
-- ----------------------------------------------------------------------------
-- CONTEXTE : le cron `expirations` archivait automatiquement les clients
-- « actif/fidele sans activité depuis 300 jours ». Sa logique était cassée :
--   1. aucun plancher sur clients.created_at → une fiche « actif » créée la
--      veille SANS présence/paiement était archivée la nuit même ;
--   2. requêtes d'activité plafonnées à 1000 lignes (limite PostgREST) ;
--   3. erreurs de requête non vérifiées → archivage de masse possible.
-- L'app ayant ~3 mois, AUCUN archivage automatique n'était légitime.
-- Le bloc a été SUPPRIMÉ du cron (commit du 2026-07-23) ; l'archivage est
-- désormais un geste manuel avec confirmation.
--
-- Ce script répare les données : il désarchive les fiches qui montrent un
-- signe de vie (présence, paiement, abonnement, ou fiche récente < 90 j).
-- Les fiches archivées SANS aucune activité ET anciennes restent archivées
-- (probablement des archivages volontaires).
--
-- ⚠️ ÉTAPE 1 — REGARDER avant de toucher : exécute d'abord le SELECT,
-- vérifie la liste (notamment qu'aucun archivage VOLONTAIRE n'y figure).
-- ============================================================================

-- ÉTAPE 1 : qui serait désarchivé ? (lecture seule)
SELECT
  c.id,
  c.prenom,
  c.nom,
  c.email,
  c.created_at::date              AS fiche_creee_le,
  p.studio_nom,
  (SELECT max(pr.created_at)::date FROM presences pr WHERE pr.client_id = c.id)  AS derniere_presence,
  (SELECT max(pa.date)             FROM paiements pa WHERE pa.client_id = c.id)  AS dernier_paiement,
  EXISTS (SELECT 1 FROM abonnements a WHERE a.client_id = c.id AND a.statut = 'actif') AS abo_actif
FROM clients c
JOIN profiles p ON p.id = c.profile_id
WHERE c.statut = 'archive'
  AND (
    EXISTS (SELECT 1 FROM presences pr WHERE pr.client_id = c.id
              AND pr.created_at >= now() - interval '300 days')
    OR EXISTS (SELECT 1 FROM paiements pa WHERE pa.client_id = c.id
              AND pa.date >= (now() - interval '300 days')::date)
    OR EXISTS (SELECT 1 FROM abonnements a WHERE a.client_id = c.id AND a.statut = 'actif')
    OR c.created_at >= now() - interval '90 days'
  )
ORDER BY p.studio_nom, c.nom, c.prenom;

-- ÉTAPE 2 : désarchiver (repasse en 'actif' — le cron promeut/laisse ensuite).
-- Décommente et exécute APRÈS avoir validé la liste de l'étape 1.
/*
UPDATE clients c
SET statut = 'actif'
WHERE c.statut = 'archive'
  AND (
    EXISTS (SELECT 1 FROM presences pr WHERE pr.client_id = c.id
              AND pr.created_at >= now() - interval '300 days')
    OR EXISTS (SELECT 1 FROM paiements pa WHERE pa.client_id = c.id
              AND pa.date >= (now() - interval '300 days')::date)
    OR EXISTS (SELECT 1 FROM abonnements a WHERE a.client_id = c.id AND a.statut = 'actif')
    OR c.created_at >= now() - interval '90 days'
  );
*/
