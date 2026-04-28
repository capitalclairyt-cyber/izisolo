-- Migration v16 : Listes d'attente sur cours complets
--
-- Workflow :
--   - Cours complet → l'élève voit un bouton "Préviens-moi si une place se libère"
--   - Email + nom + tel optionnel → entrée dans liste_attente
--   - Quand un inscrit annule (libre, pas tardive) → on promeut automatiquement
--     le 1er de la liste, on lui envoie un email Resend "Une place s'est libérée"
--
-- Unique sur (cours_id, email) pour éviter les doublons d'inscription.

create table if not exists public.liste_attente (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  cours_id    uuid references public.cours(id)    on delete cascade not null,
  client_id   uuid references public.clients(id)  on delete set null,
  email       text not null,
  nom         text,
  telephone   text,
  position    integer default 1,
  notified_at timestamptz,
  created_at  timestamptz default now(),
  unique (cours_id, email)
);

create index if not exists liste_attente_cours_idx
  on public.liste_attente (cours_id, position);

create index if not exists liste_attente_profile_idx
  on public.liste_attente (profile_id, created_at desc);

alter table public.liste_attente enable row level security;

-- Le pro voit/gère sa liste d'attente
create policy "Pro gere sa liste d'attente"
  on public.liste_attente for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- L'API publique (anon) a besoin d'INSERT via service_role (handled in route handler).
-- Pas de policy SELECT pour anon : la liste reste privée au pro.
