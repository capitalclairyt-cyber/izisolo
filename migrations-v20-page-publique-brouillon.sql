-- Migration v20 : Brouillon + publication de la page publique
--
-- Workflow :
--   - Le pro édite ses champs "Page publique" → sauvegarde dans page_publique_draft (jsonb)
--   - Bouton "Aperçu" : ouvre /p/[slug]?preview=1 qui rend la page avec le brouillon
--   - Bouton "Publier" : copie le brouillon vers les vrais champs de profiles
--
-- Le brouillon contient les mêmes clés que les colonnes publiques :
-- bio, philosophie, formations, annees_experience, horaires_studio,
-- afficher_tarifs, faq_publique, photo_url, photo_couverture,
-- instagram_url, facebook_url, website_url.
--
-- Si page_publique_draft est null → la page publique = champs live (compatibilité).

alter table public.profiles
  add column if not exists page_publique_draft        jsonb,
  add column if not exists page_publique_published_at timestamptz;
