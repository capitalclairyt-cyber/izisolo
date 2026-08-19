-- ═══════════════════════════════════════════════════════════════════════════
-- v86 — Cours en ligne : lien de visio + verrou (feedback Ariana, 2026-08-19)
-- ═══════════════════════════════════════════════════════════════════════════
-- `cours.format` existe depuis v18 (presentiel/visio/hybride) mais n'était ni
-- exposé ni lu. v86 ajoute ce qui manquait pour un cours en ligne UTILE :
--   - lien_visio : l'URL de la séance (Zoom, Meet…), servie aux inscrites
--     (espace élève + rappel J-1) via lib/visio.js — SOURCE UNIQUE de la
--     règle de visibilité :
--   - lien_visio_verrouille (défaut true) : le lien n'est montré qu'aux
--     inscrites dont la séance est RÉGLÉE ou COUVERTE (carnet/abo lié,
--     paiement paid lié à la présence, essai/offert). false = visible par
--     toutes les inscrites (cours gratuit/ouvert).
--
-- La monétisation du cours reste portée par tarif_unitaire/carnets_acceptes
-- (« Comment se paie ce cours ? »). Le déverrouillage AUTO à la seconde d'un
-- paiement Stripe par séance = v2 (webhook par cours, cf. audit portail P0 —
-- stripe_payment_link_unit dort en DB pour ça).
--
-- Lecture défensive pré-migration : lib/visio.js (colonne absente → pas de
-- lien, jamais de casse). Re-runnable.

ALTER TABLE cours ADD COLUMN IF NOT EXISTS lien_visio text;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS lien_visio_verrouille boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN cours.lien_visio IS
  'v86 — URL de la séance en ligne (Zoom, Meet…), lue via lib/visio.js uniquement';
COMMENT ON COLUMN cours.lien_visio_verrouille IS
  'v86 — true = lien réservé aux séances réglées/couvertes ; false = toutes les inscrites';
