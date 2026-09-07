-- ============================================================
-- MIGRATION v108 — « Proposer mes offres dans l'espace de mes élèves »
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Déclencheur : Manon (Soleya), 2026-09-07 : « est-ce que je peux enlever
-- les offres sur le profil des clientes ? je gère ça via mon site internet
-- pour le moment ». Sa grille publique est déjà masquée (afficher_tarifs),
-- mais la section « Les offres du studio » de l'ESPACE élève (v97) listait
-- tout son catalogue sans aucun réglage pour la cacher : ses élèves y
-- voyaient un bouton « Demander » sur chaque offre, par-dessus son propre
-- tunnel de vente. Le seul contournement aurait été de désactiver ses
-- offres, ce qui les retire aussi de son tunnel : pas une réponse.
--
-- UN booléen, défaut TRUE (rien ne change pour personne). FALSE = la section
-- disparaît de l'espace, et les demandes d'offre depuis l'espace avec elle ;
-- paiements, carnets et factures de l'élève restent affichés, la prof
-- continue de vendre depuis les fiches. Lecteur/écrivain UNIQUE :
-- lib/paiement-en-ligne.js (catalogueEspaceVisible) + route dédiée
-- /api/profile/offres-espace (patron v104 : jamais mêlé au payload de la
-- carte Page publique, dont la sauvegarde entière échouerait pré-migration).
-- ============================================================

alter table public.profiles
  add column if not exists offres_espace boolean not null default true;

comment on column public.profiles.offres_espace is
  'v108 : false = la section « Les offres du studio » est masquée dans l''espace élève (la prof vend ailleurs). Défaut true.';

do $$
begin
  raise notice '✅ v108 : profiles.offres_espace prête (% studio(s) ont masqué leurs offres)',
    (select count(*) from public.profiles where offres_espace = false);
end $$;
