-- ============================================================
-- MIGRATION v61 — Reprise des prefs cloche prof dans notif_prefs
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Unification : les 4 préférences de cloche in-app (colonnes booléennes
-- historiques) sont repliées dans profiles.notif_prefs sous le canal 'inapp',
-- pour que TOUT (cloche / push / mail) vive au même endroit (lib/notif-prefs).
-- /api/notifications/check lit désormais notif_prefs (canal inapp).
--
-- Les colonnes notif_* restent en place (vestigiales, non lues) — on ne les
-- supprime pas pour ne rien casser.
-- ============================================================

update public.profiles p
   set notif_prefs = coalesce(p.notif_prefs, '{}'::jsonb)
     || jsonb_build_object(
          'nouveau_client',    jsonb_build_object('inapp', coalesce(p.notif_nouveau_client,    true)),
          'paiement_retard',   jsonb_build_object('inapp', coalesce(p.notif_paiement_retard,   true)),
          'carnet_epuise',     jsonb_build_object('inapp', coalesce(p.notif_carnet_epuise,     true)),
          'abonnement_expire', jsonb_build_object('inapp', coalesce(p.notif_abonnement_expire, true))
        )
 where p.studio_slug is not null  -- profs uniquement
   -- Idempotent : on ne réécrit que si ces clés ne sont pas déjà posées.
   and not (p.notif_prefs ? 'nouveau_client');

do $$
begin
  raise notice '✅ v61 : prefs cloche repliées dans notif_prefs pour % profs',
    (select count(*) from public.profiles where notif_prefs ? 'nouveau_client');
end $$;
