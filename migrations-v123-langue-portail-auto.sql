-- ============================================================================
-- IziSolo — v123 : la langue du portail suit le navigateur de la visiteuse
-- (2026-09-23). Re-runnable. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-langue-auto.mjs
-- ----------------------------------------------------------------------------
-- Le réglage `profiles.langue_portail` gagne une troisième valeur, « auto »,
-- qui devient le DÉFAUT : la page publique et l'espace élève s'affichent dans
-- la langue que le navigateur de chaque visiteuse annonce (Accept-Language,
-- français ou anglais), le bouton FR / EN gardant le dernier mot. « fr » et
-- « en » restent : le studio a choisi, le navigateur ne compte plus.
--
-- POURQUOI. Le 23/09, aucun studio n'avait touché ce réglage (v121 posait
-- « fr » à tout le monde) : les élèves anglophones de Romain (Chessy) ont
-- lu le français pendant quatre jours alors que leur téléphone disait
-- l'anglais, et une seule sur quinze a trouvé la pastille EN. On a mis sa
-- page en anglais à la main ; « auto » évite ce geste au prochain studio.
--
-- Le backfill passe « fr » → « auto » : personne n'a jamais CHOISI le
-- français (la valeur venait du défaut), et une francophone continue de
-- voir le français, son navigateur le dit. « en » (choisi le jour même pour
-- Romain) est conservé. Écrivain UNIQUE : PATCH /api/profile/langue-portail ;
-- lecteur UNIQUE : lib/i18n-portail-serveur.js. Sans v123, « auto » est
-- refusé par le CHECK de v121 et la route répond 503 MIGRATION_V123_REQUISE ;
-- tout le reste marche comme avant.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_langue_portail_check;

alter table public.profiles
  add constraint profiles_langue_portail_check
  check (langue_portail in ('auto', 'fr', 'en'));

alter table public.profiles
  alter column langue_portail set default 'auto';

update public.profiles
   set langue_portail = 'auto'
 where langue_portail = 'fr';

do $$
begin
  raise notice '✅ v123 : profiles.langue_portail (auto | fr | en, défaut auto) : la page suit le navigateur de la visiteuse tant que le studio n''a rien choisi';
end $$;
