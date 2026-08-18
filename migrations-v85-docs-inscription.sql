-- ═══════════════════════════════════════════════════════════════════════════
-- v85 — Documents d'inscription du studio (demande Patricia, 2026-08-18)
-- ═══════════════════════════════════════════════════════════════════════════
-- La prof dépose jusqu'à 3 documents (questionnaire santé QS-SPORT, CGV /
-- règlement intérieur…) dans Paramètres → Portail public → Ma page. Ils sont
-- proposés aux élèves sur le formulaire d'essai et dans leur espace, avec la
-- consigne « imprime et rapporte signé » (pas de signature électronique).
--
-- Forme : [{ "url": "https://…", "nom": "Questionnaire santé", "ajoute_le": "2026-08-18" }]
-- Les fichiers vivent sur Vercel Blob (comme les pièces jointes messagerie).
-- Lecture UNIQUEMENT via lib/docs-inscription.js (getDocsInscription,
-- défensive : sans cette migration, la feature est simplement invisible).
--
-- Re-runnable.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS docs_inscription jsonb;

COMMENT ON COLUMN profiles.docs_inscription IS
  'v85 — documents d''inscription [{url, nom, ajoute_le}] (Blob), lus via lib/docs-inscription.js';
