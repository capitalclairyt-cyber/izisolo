-- ============================================================
-- MIGRATION v104 — Les couleurs de la prof, jusque sur son portail
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Déclencheur : une prof qui lance son activité, venue d'un vocal Instagram
-- le 2026-08-25. Elle partait sur un concurrent et en est revenue déçue du
-- rendu visuel. Sa priorité, c'est son branding.
--
-- Les deux couleurs libres existaient déjà (Manon, 2026-07-28) mais SEULEMENT
-- pour le bloc intégré : elles vivaient dans le code collé sur son site,
-- jamais en base. Résultat, son planning intégré était à ses couleurs et la
-- page où l'on atterrit gardait la palette du métier. Deux univers pour un
-- même studio, exactement ce qu'une personne attachée au visuel remarque.
--
-- UNE colonne jsonb, UN lecteur (lib/couleurs-marque.js — règle §12 : un
-- JSONB de config se lit par SON helper) :
--   { "c1": "7a5fb0", "c2": "e8927c" }   -- hex SANS #, minuscules, validés
-- NULL = aucun réglage : le portail garde la palette du métier, comme avant.
--
-- Aucune couleur brute ne peint jamais un texte : les rôles sont DÉRIVÉS avec
-- un plancher de contraste 4.6:1 vs blanc (lib/embed-couleurs). Un jaune pâle
-- donne quand même un bouton lisible.
-- ============================================================

alter table public.profiles add column if not exists couleurs_marque jsonb;

do $$
begin
  raise notice '✅ v104 : profiles.couleurs_marque prête (% studio(s) déjà aux siennes)',
    (select count(*) from public.profiles where couleurs_marque is not null);
end $$;
