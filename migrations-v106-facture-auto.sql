-- ============================================================
-- MIGRATION v106 — La facture qui part toute seule à l'encaissement
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Déclencheur : Manon (Soleya), 2026-09-07 : « pour mes abonnements au
-- mois, comment je fais pour que ça leur génère automatiquement une
-- facture chaque début de mois ? Je n'arrive à générer qu'une facture
-- pour le mois d'août. »
--
-- Une facture IziSolo est une facture ACQUITTÉE (v84) : elle naît d'un
-- paiement reçu, jamais avant. « Une facture chaque mois » veut donc dire
-- « un paiement chaque mois » (les versements mensuels du même lot, aucune
-- colonne) PUIS « une facture qui part sans clic » — c'est ce booléen.
--
-- Quand il est vrai, chaque paiement qui devient réglé (Encaisser, vente
-- payée comptant, webhook Stripe) émet sa facture par la RPC v84 habituelle
-- (même numérotation, même snapshot figé) et l'envoie à l'élève en pièce
-- jointe. Rien ne change pour l'élève qui télécharge depuis son espace :
-- c'est le MÊME document, le même numéro (lib/facture-auto.js).
--
-- Défaut FALSE : une prof qui n'a rien demandé ne voit pas ses élèves
-- recevoir des emails du jour au lendemain. Sans SIRET, le réglage est
-- inopérant (pas de facture possible, donc rien à envoyer).
-- ============================================================

alter table public.profiles
  add column if not exists facturation_auto boolean not null default false;

comment on column public.profiles.facturation_auto is
  'v106 : true = chaque paiement encaissé émet sa facture et l''envoie à l''élève par email (lib/facture-auto.js). Inopérant sans SIRET.';

do $$
begin
  raise notice '✅ v106 : profiles.facturation_auto prête (% studio(s) en envoi automatique)',
    (select count(*) from public.profiles where facturation_auto);
end $$;
