-- Migration v18 : Vidéos de cours (visio live + replay/on-demand)
--
-- 2 dimensions :
--  - Sur les cours existants : ajout `format` (presentiel/visio/hybride) +
--    `lien_visio` pour Zoom/Meet/Whereby.
--  - Nouvelle table `videos_cours` pour les replays/on-demand, avec
--    monétisation inclus_abo (gratuit pour les abonnés actifs) ou paye
--    (à l'unité, prévu V2).

-- ── 1. Format des cours
alter table public.cours
  add column if not exists format     text default 'presentiel'
    check (format in ('presentiel', 'visio', 'hybride')),
  add column if not exists lien_visio text;

-- ── 2. Vidéothèque
create table if not exists public.videos_cours (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles(id) on delete cascade not null,
  titre           text not null,
  description     text,
  url_video       text not null,           -- URL externe (YouTube, Vimeo, Drive…)
  vignette_url    text,
  duree_minutes   integer,
  type_cours      text,                    -- ex: 'Hatha', 'Vinyasa' (filtrage)
  acces           text default 'inclus_abo'
    check (acces in ('gratuit', 'inclus_abo', 'paye')),
  prix            numeric(8,2),            -- pour acces='paye' (V2)
  publie          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists videos_cours_profile_idx
  on public.videos_cours (profile_id, publie, created_at desc);

alter table public.videos_cours enable row level security;

-- Pro gère ses vidéos
create policy "Pro gere ses videos"
  on public.videos_cours for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Lecture publique des vidéos publiées (le filtrage par accès se fait côté API)
create policy "Lecture publique videos publiees"
  on public.videos_cours for select
  using (publie = true);

create or replace function public.update_videos_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists videos_cours_updated_at on public.videos_cours;
create trigger videos_cours_updated_at
  before update on public.videos_cours
  for each row execute function public.update_videos_updated_at();
