-- Migration v17 : Templates email/SMS prédéfinis et personnalisables
--
-- Le pro a accès à un catalogue de templates pré-définis (côté code,
-- voir lib/templates-defaut.js) qu'il peut utiliser tels quels OU dont
-- il peut créer une version personnalisée stockée ici.
--
-- Variables supportées : {{prenom}} {{nom}} {{cours_nom}} {{date}}
-- {{heure}} {{lieu}} {{studio}}.

create table if not exists public.templates_communication (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  type        text not null check (type in ('email', 'sms')),
  cle         text,                         -- ex: 'bienvenue', 'rappel_j-1', 'absence'
                                            -- null = template totalement custom
  nom         text not null,
  sujet       text,                         -- email uniquement
  corps       text not null,
  ordre       integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (profile_id, type, cle)            -- 1 perso par cle predefinie
);

create index if not exists templates_communication_profile_idx
  on public.templates_communication (profile_id, type, ordre);

alter table public.templates_communication enable row level security;

create policy "Pro gere ses templates"
  on public.templates_communication for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create or replace function public.update_templates_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists templates_communication_updated_at on public.templates_communication;
create trigger templates_communication_updated_at
  before update on public.templates_communication
  for each row execute function public.update_templates_updated_at();
