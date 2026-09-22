-- ============================================================================
-- IziSolo — v121 : la langue du portail élève (2026-09-22)
-- Re-runnable. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-portail-anglais.mjs
-- ----------------------------------------------------------------------------
-- Une seule colonne : `profiles.langue_portail` text, 'fr' par défaut, 'en'
-- possible. C'est la langue PAR DÉFAUT de la page publique et de l'espace
-- élève d'un studio ; chaque visiteuse peut encore basculer avec le
-- sélecteur FR / EN de l'en-tête (cookie `izi_lang`, qui prime).
--
-- POURQUOI. Romain (Shared Experience, Chessy, à côté de Disneyland) a
-- publié son planning le 19/09 et treize élèves sont passées par « Mon
-- espace ». Cinq se sont arrêtées à la connexion sans jamais réserver, et
-- leurs prénoms sont anglais : elles ont reçu un email en français, atterri
-- sur un écran en français, et pensé avoir fini.
--
-- Écrivain UNIQUE : la route dédiée PATCH /api/profile/langue-portail
-- (patron v104 / v108 : jamais dans le payload de la carte « Page
-- publique », dont toute la sauvegarde échouerait tant que la colonne
-- manque). Lecteur UNIQUE : lib/i18n-portail-serveur.js, par une requête
-- SÉPARÉE et défensive. Sans la migration, tout le monde reste en français
-- ou dans la langue de son cookie : exactement l'état d'avant.
-- ============================================================================

alter table public.profiles
  add column if not exists langue_portail text not null default 'fr';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_langue_portail_check'
  ) then
    alter table public.profiles
      add constraint profiles_langue_portail_check
      check (langue_portail in ('fr', 'en'));
  end if;
end $$;

do $$
begin
  raise notice '✅ v121 : profiles.langue_portail (fr | en, défaut fr) : la langue par défaut du portail élève';
end $$;
