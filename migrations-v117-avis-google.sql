-- ============================================================================
-- IziSolo — v117 : demander un avis Google (2026-09-14)
-- Re-runnable. Puis :
--   node scripts/verifier-selects.mjs
--   node scripts/proof-avis-google.mjs
-- ----------------------------------------------------------------------------
-- Une seule colonne : `profiles.avis_google` jsonb, NULL = aucun réglage.
--   { "lien": "https://g.page/r/…/review", "auto": true }
--   lien : l'adresse « Demander des avis » de la fiche Google Business Profile
--          (validée côté code : https, hôtes Google seulement, jamais devinée)
--   auto : l'email « Un mot sur tes séances ? » part tout seul après la 3e
--          présence pointée (défaut true dès qu'un lien est posé)
-- Rien ne change pour l'existant : personne n'a de lien, aucun email ne part.
-- Lecteur / écrivain UNIQUE : lib/avis-google.js (requête SÉPARÉE, patron
-- v104 : la colonne n'entre jamais dans un select principal ni dans le payload
-- de la carte Page publique, dont la sauvegarde entière échouerait sans v117).
-- Dédup de l'email : notifications_eleves (client, type 'avis_google',
-- related_id = studio, canal email) → une seule sollicitation par élève et
-- par studio, à vie. Aucune table neuve, aucune policy.
-- ============================================================================

alter table public.profiles
  add column if not exists avis_google jsonb;

do $$
begin
  raise notice '✅ v117 : profiles.avis_google (lien + email automatique après la 3e séance)';
end $$;
