-- Migration v22 : Récurrences enrichies — exclusion vacances + nb occurrences
--
-- Améliorations de l'UX récurrences :
--   1. Choix "nombre de cours" en alternative à "date de fin"
--      → champ recurrences.nb_occurrences (int nullable)
--   2. Exclusion automatique des vacances scolaires + jours fériés
--      → recurrences.exclure_vacances (bool, default false)
--      → recurrences.exclure_feries    (bool, default false)
--      → recurrences.zone_vacances     (text 'A'|'B'|'C'|'Corse', NULL = pas d'exclusion vacances)
--   3. Zone par défaut sauvegardée sur le profil pour pré-remplir les futurs forms
--      → profiles.zone_vacances_default
--
-- Note : les exclusions sont SAUVEGARDÉES sur la récurrence (pas juste appliquées
-- au moment de la génération). Comme ça, on peut "régénérer" les cours futurs
-- d'une récurrence en respectant les mêmes règles (ex: prolongation d'une série).

alter table public.recurrences
  add column if not exists nb_occurrences   int,
  add column if not exists exclure_vacances boolean default false,
  add column if not exists exclure_feries   boolean default false,
  add column if not exists zone_vacances    text check (zone_vacances in ('A', 'B', 'C', 'Corse'));

alter table public.profiles
  add column if not exists zone_vacances_default text check (zone_vacances_default in ('A', 'B', 'C', 'Corse'));

comment on column public.recurrences.nb_occurrences is
  'Nombre cible de cours à générer (alternative à date_fin). NULL = utiliser date_fin.';
comment on column public.recurrences.exclure_vacances is
  'Si true, les dates pendant les vacances scolaires de zone_vacances sont sautées.';
comment on column public.recurrences.exclure_feries is
  'Si true, les jours fériés français sont sautés.';
comment on column public.recurrences.zone_vacances is
  'Zone scolaire FR (A/B/C/Corse) utilisée pour calculer les vacances à exclure.';
comment on column public.profiles.zone_vacances_default is
  'Zone par défaut du studio, pré-remplit le form de création de récurrence.';
