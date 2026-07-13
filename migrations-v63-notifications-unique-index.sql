-- ============================================================
-- MIGRATION v63 — Fix cloche prof : index unique NON partiel sur notifications
-- ============================================================
--
-- BUG (découvert 2026-07-13) : la cloche de notifications du pro ne recevait
-- JAMAIS les notifs à ref_key (essai, réservation, paiement en retard, carnet
-- épuisé, abonnement qui expire, anniversaire...).
--
-- Cause : v10 a créé l'index unique de déduplication en PARTIEL :
--     CREATE UNIQUE INDEX notifications_ref_key_unique
--       ON notifications (profile_id, ref_key) WHERE ref_key IS NOT NULL;
-- Or PostgREST/Supabase `.upsert(..., { onConflict: 'profile_id,ref_key' })`
-- génère `ON CONFLICT (profile_id, ref_key)` SANS prédicat → PostgreSQL ne
-- peut pas inférer un index partiel comme arbitre → erreur 42P10
-- « there is no unique or exclusion constraint matching the ON CONFLICT
-- specification ». L'upsert échoue en silence (error retournée, pas throw)
-- → aucune notif insérée. Vérifié empiriquement sur le compte démo.
--
-- Fix : remplacer l'index PARTIEL par un index NON partiel sur les mêmes
-- colonnes. Les ref_key NULL restent DISTINCTS (NULLS DISTINCT par défaut sous
-- Postgres) → les inserts sans ref_key ne conflictent pas entre eux, aucun
-- changement de comportement pour ces lignes.
--
-- Aucun redéploiement de code requis : le code fait déjà le bon upsert, il lui
-- manquait juste la contrainte pour fonctionner.
--
-- Re-runnable.
-- ============================================================

-- Filet : purge d'éventuels doublons (profile_id, ref_key) non-null avant de
-- poser l'index non partiel (garde la ligne la plus récente par ctid). En
-- pratique il ne devrait pas y en avoir (l'ancien index partiel les empêchait
-- déjà), mais on sécurise la création de l'index.
DELETE FROM public.notifications a
USING public.notifications b
WHERE a.ref_key IS NOT NULL
  AND a.profile_id = b.profile_id
  AND a.ref_key   = b.ref_key
  AND a.ctid < b.ctid;

DROP INDEX IF EXISTS notifications_ref_key_unique;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_ref_key_unique
  ON public.notifications (profile_id, ref_key);

DO $$
BEGIN
  RAISE NOTICE '✅ v63 : index unique NON partiel (profile_id, ref_key) posé — la cloche prof reçoit enfin ses notifs (upsert onConflict OK).';
END $$;
