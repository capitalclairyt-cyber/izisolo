-- ============================================================================
-- v79 — Masquage durable de la checklist de démarrage (retour Colin 2026-07-25)
-- ----------------------------------------------------------------------------
-- La croix de la checklist du dashboard n'a JAMAIS été cliquable en prod
-- (le header, position:relative et postérieur dans le DOM, peignait par-dessus
-- et interceptait les clics — réparé côté code par un z-index). Le masquage
-- historique était localStorage (par navigateur) : cette colonne le rend
-- durable et cross-device. Le code dégrade proprement sans elle (localStorage
-- continue de couvrir l'appareil, l'écriture API échoue en silence).
--
-- Re-runnable.
-- ============================================================================

alter table public.profiles
  add column if not exists checklist_masquee boolean not null default false;

comment on column public.profiles.checklist_masquee is
  'La prof a masqué la checklist de démarrage du dashboard (croix, dashboard). Durable et cross-device, contrairement au localStorage historique.';
