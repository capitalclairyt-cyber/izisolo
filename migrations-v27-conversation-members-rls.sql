-- Migration v27 : Fix schéma conversation_members + RLS + backfill
--
-- BUG v24 : la table conversation_members avait
--   PRIMARY KEY (conversation_id, profile_id, client_id)
--   CHECK ((profile_id is not null and client_id is null) or (profile_id is null and client_id is not null))
-- Contradiction : la PK impose NOT NULL sur les 3 colonnes, le CHECK exige
-- qu'une des 2 dernières soit NULL. Conséquence : tout INSERT échouait
-- silencieusement (errreur 23502 violée par la couche client).
-- Aucun memberships n'a donc été créé jamais. Les conversations existent mais
-- la table conversation_members est vide.
--
-- Fix :
--  1. Drop la PK contradictoire
--  2. Ajouter un id UUID surrogate comme nouvelle PK
--  3. Remplacer la PK logique par 2 unique indexes partiels (1 pour pro, 1 pour élève)
--  4. Garder le CHECK exactly-one
--  5. Fix RLS : le pro peut CRUD toute ligne liée à SES conversations
--  6. Backfill les memberships manquants

-- ─── 1. Surrogate PK ────────────────────────────────────────────────────────
alter table public.conversation_members
  add column if not exists id uuid default gen_random_uuid();

-- Remplir id pour les lignes existantes (au cas où il y en aurait — peu probable)
update public.conversation_members set id = gen_random_uuid() where id is null;

alter table public.conversation_members
  alter column id set not null;

-- Drop l'ancienne PK contradictoire si présente
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'conversation_members_pkey'
      and conrelid = 'public.conversation_members'::regclass
  ) then
    alter table public.conversation_members drop constraint conversation_members_pkey;
  end if;
end $$;

-- Nouvelle PK
alter table public.conversation_members
  add constraint conversation_members_pkey primary key (id);

-- Maintenant que la PK ne force plus NOT NULL sur profile_id/client_id, retirer
-- explicitement ces NOT NULL au cas où ils auraient persisté.
alter table public.conversation_members alter column profile_id drop not null;
alter table public.conversation_members alter column client_id drop not null;

-- ─── 2. Unique indexes partiels (un membre pro / un membre élève par conv) ──
drop index if exists conv_members_unique_pro;
create unique index conv_members_unique_pro
  on public.conversation_members (conversation_id, profile_id)
  where profile_id is not null;

drop index if exists conv_members_unique_eleve;
create unique index conv_members_unique_eleve
  on public.conversation_members (conversation_id, client_id)
  where client_id is not null;

-- ─── 3. Policy RLS : pro = owner de la conversation ────────────────────────
drop policy if exists "Pro CRUD ses members" on public.conversation_members;
drop policy if exists "Pro CRUD members de ses conversations" on public.conversation_members;
create policy "Pro CRUD members de ses conversations"
  on public.conversation_members for all
  using (
    conversation_id in (
      select id from public.conversations where profile_id = auth.uid()
    )
  )
  with check (
    conversation_id in (
      select id from public.conversations where profile_id = auth.uid()
    )
  );

-- (la policy "Eleve CRUD ses members" de v24 reste valide via match email)

-- ─── 4. Backfill : créer les memberships manquants ─────────────────────────
-- 4a. Pour chaque conversation 1-to-1 : pro + élève
insert into public.conversation_members (conversation_id, profile_id, client_id)
select c.id, c.profile_id, null::uuid
from public.conversations c
where c.type = 'client'
  and not exists (
    select 1 from public.conversation_members m
    where m.conversation_id = c.id and m.profile_id = c.profile_id
  );

insert into public.conversation_members (conversation_id, profile_id, client_id)
select c.id, null::uuid, c.client_id
from public.conversations c
where c.type = 'client'
  and c.client_id is not null
  and not exists (
    select 1 from public.conversation_members m
    where m.conversation_id = c.id and m.client_id = c.client_id
  );

-- 4b. Pour les conversations de type 'cours' : pro + tous les inscrits
insert into public.conversation_members (conversation_id, profile_id, client_id)
select c.id, c.profile_id, null::uuid
from public.conversations c
where c.type = 'cours'
  and not exists (
    select 1 from public.conversation_members m
    where m.conversation_id = c.id and m.profile_id = c.profile_id
  );

insert into public.conversation_members (conversation_id, profile_id, client_id)
select distinct c.id, null::uuid, p.client_id
from public.conversations c
join public.presences p on p.cours_id = c.cours_id
where c.type = 'cours'
  and not exists (
    select 1 from public.conversation_members m
    where m.conversation_id = c.id and m.client_id = p.client_id
  );

-- ─── Vérif ─────────────────────────────────────────────────────────────────
do $$
declare
  n_conv int;
  n_members int;
  n_pros int;
  n_eleves int;
begin
  select count(*) into n_conv from public.conversations;
  select count(*) into n_members from public.conversation_members;
  select count(*) into n_pros from public.conversation_members where profile_id is not null;
  select count(*) into n_eleves from public.conversation_members where client_id is not null;
  raise notice '✅ % conversations, % members (% pro + % élève)', n_conv, n_members, n_pros, n_eleves;
end $$;
