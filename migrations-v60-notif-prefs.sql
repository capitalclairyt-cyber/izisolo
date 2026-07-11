-- ============================================================
-- MIGRATION v60 — Préférences de notification (élève + prof)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Une colonne JSONB par côté : chaque type de notif → booléen on/off.
-- Clé absente = défaut du catalogue (lib/notif-prefs.js). Ça évite une table
-- par-type et reste extensible (ajouter un type = juste une clé + un défaut).
--   - clients.notif_prefs   : préférences de l'élève (par fiche = par studio)
--   - profiles.notif_prefs  : préférences du prof
-- ============================================================

alter table public.clients  add column if not exists notif_prefs jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists notif_prefs jsonb default '{}'::jsonb;

do $$
begin
  raise notice '✅ v60 : notif_prefs ajoutée sur clients (%) et profiles (%)',
    (select count(*) from public.clients),
    (select count(*) from public.profiles);
end $$;
