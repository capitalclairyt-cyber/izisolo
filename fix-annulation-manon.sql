-- ════════════════════════════════════════════════════════════════════════
-- Réparation ponctuelle — annulation de Manon (Soleya) marquée tardive à tort
-- (2026-07-25). Cause : bug HH:MM:SS dans evaluerAnnulation (fixé + spec) —
-- son annulation UN MOIS avant le cours a été traitée « moins de 24 h »,
-- la présence marquée annulation_tardive/est_due et 1 séance décomptée de
-- son Carnet 10 séances.
--
-- Ce script rejoue ce qu'aurait fait l'annulation LIBRE :
--   1) re-crédite la séance sur son carnet (1 → 0 utilisée)
--   2) supprime la présence-réservation
--
-- ── 1. CONTRÔLE (lancer d'abord, vérifier 1 ligne chacun) ────────────────
SELECT p.id, p.annulation_tardive, p.est_due, c.nom, c.date, cl.prenom, cl.email
FROM presences p
JOIN cours c ON c.id = p.cours_id
JOIN clients cl ON cl.id = p.client_id
WHERE p.id = 'f6e9ba9c-69ca-40c1-9e4a-a7b750506a7d';

SELECT id, offre_nom, seances_total, seances_utilisees
FROM abonnements
WHERE id = 'aee279c0-b8a3-4f2d-a9de-23f3a553297a';
-- Attendu : seances_utilisees = 1 (le décompte fautif)

-- ── 2. RÉPARATION (décommenter puis lancer) ──────────────────────────────
-- UPDATE abonnements
--   SET seances_utilisees = greatest(0, seances_utilisees - 1)
--   WHERE id = 'aee279c0-b8a3-4f2d-a9de-23f3a553297a';
--
-- DELETE FROM presences
--   WHERE id = 'f6e9ba9c-69ca-40c1-9e4a-a7b750506a7d';
