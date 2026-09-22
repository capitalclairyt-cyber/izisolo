-- ============================================================================
-- IziSolo — v122 : la langue d'une élève, mémorisée sur sa fiche (2026-09-22)
-- Re-runnable. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-emails-anglais.mjs
-- ----------------------------------------------------------------------------
-- Une seule colonne : `clients.langue` text, NULL par défaut, 'fr' ou 'en'.
-- NULL = elle n'a rien choisi, elle suit le réglage du studio (v121).
--
-- POURQUOI. Depuis v121 le portail parle anglais quand l'élève le choisit,
-- mais ce choix vit dans un COOKIE sur son téléphone. Un email de rappel J-1
-- part d'un cron, une annulation part du geste de la prof : ni l'un ni
-- l'autre n'a ce cookie sous la main, donc ces emails restaient en français.
-- La fiche est PAR STUDIO (comme `auth_user_id` v83 et `derniere_visite_at`
-- v120) : une élève peut lire l'anglais chez Romain et le français ailleurs.
--
-- Elle naît NULL : c'est un CHOIX, jamais un défaut deviné (le dégât du
-- `DEFAULT now()` de v24, §12). Écrivain : `poserLangueFiche` de
-- lib/i18n-portail-serveur.js, par un UPDATE SÉPARÉ et conditionnel (jamais
-- dans un insert ni un select principal), appelé quand elle bascule EN sur
-- son espace, sur la page du studio, ou quand elle réserve avec le cookie.
-- Lecteurs : `langueEleve` (pur) et `chargerLanguesFiches` (lot d'ids,
-- défensif) pour les crons et les routes qui écrivent à une élève.
-- Aucune policy : l'écriture passe en service_role, la lecture suit les
-- policies `clients` existantes (la prof lit la langue de ses élèves, c'est
-- sa fiche).
-- ============================================================================

alter table public.clients
  add column if not exists langue text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_langue_check'
  ) then
    alter table public.clients
      add constraint clients_langue_check
      check (langue is null or langue in ('fr', 'en'));
  end if;
end $$;

do $$
begin
  raise notice '✅ v122 : clients.langue (fr | en, NULL = suit le réglage du studio) : la langue des emails et des push d''une élève';
end $$;
