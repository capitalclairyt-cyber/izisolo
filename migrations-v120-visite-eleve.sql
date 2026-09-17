-- ============================================================================
-- IziSolo — v120 : « est-elle déjà venue CHEZ MOI ? » (2026-09-17)
-- Re-runnable. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-badge-compte.mjs
-- ----------------------------------------------------------------------------
-- Une seule colonne : `clients.derniere_visite_at` timestamptz, NULL = cette
-- personne n'a jamais ouvert l'espace DE CE STUDIO.
--
-- POURQUOI. La pastille « Compte actif · dernière connexion le 26 juil. » de
-- la liste des élèves lisait `auth.users.last_sign_in_at` (RPC v67), qui est la
-- dernière connexion du COMPTE. Or l'identité élève est GLOBALE : un compte par
-- email, pour tout IziSolo. Constaté le 17/09 sur Atout Gym, le jour de son
-- import : quatre adhérentes s'affichaient « actives » parce qu'elles sont
-- aussi élèves chez Maude Yoga, alors qu'aucune des 43 fiches n'avait jamais
-- ouvert l'espace de l'association. La présidente lisait l'activité d'un autre
-- studio, et en concluait qu'elle n'avait pas à les inviter.
--
-- v67 disait en commentaire « pas de fuite cross-studio » : c'est vrai des
-- LIGNES (la RPC ne rend que les fiches de la prof appelante), faux de la
-- VALEUR. Cette colonne est la même information, mais scopée au studio.
--
-- Elle naît NULL et n'est posée QUE par une visite réelle : jamais de
-- `DEFAULT now()`, qui ferait naître toute fiche « déjà venue » (le dégât
-- exact du `last_read_at DEFAULT now()` de v24, backfillé le 2026-08-01).
--
-- Écrivain UNIQUE : lib/fiche-eleve.js, au point de résolution v83, par un
-- UPDATE conditionnel séparé (patron poserLienVisio v86). La colonne n'entre
-- JAMAIS dans un select de portail : les deux surfaces qui la LISENT (liste et
-- fiche élève, côté prof) sont déjà en `select('*')`, donc elles la reçoivent
-- le jour où elle existe et vivent sans elle avant. Aucune policy : l'écriture
-- passe en service_role, la lecture suit les policies `clients` existantes.
-- ============================================================================

alter table public.clients
  add column if not exists derniere_visite_at timestamptz;

do $$
begin
  raise notice '✅ v120 : clients.derniere_visite_at (a-t-elle ouvert l''espace DE CE studio, et quand)';
end $$;
