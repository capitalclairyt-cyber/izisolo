-- ============================================================================
-- IziSolo — v115 : les portails qui se citent (2026-09-13)
-- Lot 5 du chantier Associations & Studios (PLAN-ASSOS-STUDIOS-2026.md §6.6
-- « pont 5 » et §6.7 « pont 6 »).
-- Re-runnable. À appliquer APRÈS v114. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-vitrines-ponts.mjs
-- ----------------------------------------------------------------------------
-- Un seul geste : `studio_membres.portail_croise`, le choix de la PERSONNE de
-- relier sa page IziSolo et celle de la structure où elle donne cours, dans
-- les deux sens (« Je donne aussi des cours à Yoga pour tous » sur la sienne,
-- « Sa page » sur l'onglet L'équipe de la structure). Opt-in : rien n'est
-- relié tant qu'elle ne le demande pas, et la structure ne montre son équipe
-- que si elle a rempli des prénoms (v111). Le hub élève `/mes-studios` ne
-- demande aucune colonne : il lit les fiches par compte (v83) et par email.
--
-- Rien ne change pour l'existant (défaut false).
-- ============================================================================

alter table public.studio_membres
  add column if not exists portail_croise boolean not null default false;

-- ── Contrôle ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_membres' and column_name = 'portail_croise') then
    raise exception 'v115 : studio_membres.portail_croise manquante';
  end if;
end $$;
