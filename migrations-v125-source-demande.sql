-- ============================================================================
-- IziSolo — v125 : d'où vient une demande concierge (2026-09-26). Re-runnable.
-- Puis : node scripts/verifier-selects.mjs
-- ----------------------------------------------------------------------------
-- La campagne Google Ads se mesure SANS balise Google (la page RGPD promet
-- « aucun traqueur tiers ») : la source voyage dans l'URL (utm_*), recopiée par
-- LienCta jusqu'aux formulaires. À l'inscription elle vit dans la metadata du
-- compte (rien à migrer). Sur la demande « on crée ton studio », il lui faut
-- une colonne : `source` = « google / cpc / recherche / yoga / logiciel prof
-- yoga », posée par un UPDATE SÉPARÉ après l'insert (patron poserLienVisio
-- v86), donc une demande passe toujours, avec ou sans v125.
-- ============================================================================
alter table public.demandes_studio
  add column if not exists source text
  check (source is null or char_length(source) <= 200);

comment on column public.demandes_studio.source is
  'D''où vient la demande (utm_* de l''annonce, lib/acquisition resumeAcquisition). NULL = direct ou inconnu.';
