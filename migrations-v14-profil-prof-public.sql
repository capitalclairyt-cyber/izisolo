-- Migration v14 : Profil prof public enrichi
--
-- But : permettre à chaque pro de raconter son histoire sur sa page publique
-- /p/[studio_slug]. Tous les champs sont optionnels — la page se déploie
-- gracefully selon ce qui est renseigné (pas de placeholder vide affiché).
--
-- Données privées (id, plan, stripe_*, alerte_seuil_*) ne sont jamais
-- exposées via la page publique, qui ne sélectionne que les colonnes ci-dessous.

alter table public.profiles
  -- Identité visuelle
  add column if not exists photo_url           text,
  add column if not exists photo_couverture    text,

  -- Storytelling
  add column if not exists bio                 text,
  add column if not exists philosophie         text,
  add column if not exists formations          text,
  add column if not exists annees_experience   integer,

  -- Pratique du studio
  add column if not exists horaires_studio     text,
  add column if not exists afficher_tarifs     boolean default false,
  add column if not exists faq_publique        jsonb default '[]'::jsonb,

  -- Réseaux sociaux + site
  add column if not exists instagram_url       text,
  add column if not exists facebook_url        text,
  add column if not exists website_url         text;

-- Validation basique des URLs (NULL ou doit ressembler à une URL)
alter table public.profiles
  drop constraint if exists profiles_instagram_url_format;
alter table public.profiles
  add constraint profiles_instagram_url_format
  check (instagram_url is null or instagram_url ~* '^https?://');

alter table public.profiles
  drop constraint if exists profiles_facebook_url_format;
alter table public.profiles
  add constraint profiles_facebook_url_format
  check (facebook_url is null or facebook_url ~* '^https?://');

alter table public.profiles
  drop constraint if exists profiles_website_url_format;
alter table public.profiles
  add constraint profiles_website_url_format
  check (website_url is null or website_url ~* '^https?://');

alter table public.profiles
  drop constraint if exists profiles_annees_experience_positive;
alter table public.profiles
  add constraint profiles_annees_experience_positive
  check (annees_experience is null or annees_experience >= 0);
