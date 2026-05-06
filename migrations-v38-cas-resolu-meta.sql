-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v38 : ajout `resolu_meta` JSONB à cas_a_traiter
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Stocke la métadonnée de résolution d'un cas pour permettre :
--   • undo dans les 7 jours (sait quelle ressource a été liée)
--   • traçabilité : quel mode (deja_fait | a_faire | direct) a été choisi
--   • lien vers la ressource créée (paiement_id, abonnement_id) pour
--     pouvoir y retourner depuis l'historique
--
-- Forme :
--   {
--     "mode": "deja_fait" | "a_faire" | "direct",
--     "ressource_type": "paiement" | "abonnement" | "presence" | null,
--     "ressource_id": "uuid|null",
--     "before_state": { ... }  // snapshot pour undo des actions directes
--   }
--
-- Idempotent.

ALTER TABLE public.cas_a_traiter
  ADD COLUMN IF NOT EXISTS resolu_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN public.cas_a_traiter.resolu_meta IS
  'Métadonnée de résolution. Forme : { mode, ressource_type, ressource_id, before_state }. Permet undo + lien vers ressource.';

DO $$
BEGIN
  RAISE NOTICE '✅ v38 : cas_a_traiter.resolu_meta ajoutée.';
END $$;
