-- ════════════════════════════════════════════════════════════════════════
-- v73 — Cours privés « sur invitation » (retour Maude, 2026-07-24)
--   Nouveau niveau de visibilité `prive` pour les cours individuels :
--   invisible partout sur le portail public (liste, essai, réservation,
--   liste d'attente), visible uniquement par la prof et par les élèves
--   qu'elle a ajoutés au cours (leur présence-réservation le fait
--   apparaître dans « Mes cours à venir » de leur espace).
--
--   Rien d'autre ne change : « inviter » = le geste « Ajouter des élèves »
--   existant (pointage), + un email « Prévenir » optionnel côté détail du
--   cours (route /api/cours/inviter, dédupé via emails_envoyes).
--
--   Re-runnable.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.cours
  DROP CONSTRAINT IF EXISTS cours_visibilite_check;

ALTER TABLE public.cours
  ADD CONSTRAINT cours_visibilite_check
  CHECK (visibilite IN ('public', 'inscrits', 'abonnes', 'fideles', 'prive'));

COMMENT ON COLUMN public.cours.visibilite IS
  'public | inscrits | abonnes | fideles | prive (v73 : privé = sur invitation, jamais listé sur le portail)';

DO $$ BEGIN
  RAISE NOTICE '✅ v73 : visibilité « prive » disponible sur les cours.';
END $$;
