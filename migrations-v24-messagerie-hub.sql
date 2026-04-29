-- Migration v24 : Hub central de messagerie (conversations bidirectionnelles)
--
-- Architecture : 1 table `conversations` qui peut être :
--   - 1-to-1 avec un élève (type='client', client_id renseigné)
--   - groupe par cours (type='cours', cours_id renseigné)
--   - broadcast/annonce (créée à la volée par fan-out, pas de cible figée)
--
-- Chaque conversation contient des `messages` bidirectionnels (sender_type =
-- 'pro' ou 'eleve'). Les annonces groupées (ancien /communication) créent UN
-- message dans plusieurs conversations 1-to-1 d'un coup (fan-out côté API).
--
-- Côté élève : on n'a pas de table `users` pour les non-inscrits — un élève
-- répond depuis son `/p/[slug]/espace` après login Supabase. Le rattachement
-- se fait par client.email = auth.user.email (déjà fait pour les sondages).
--
-- Notifs : digest 18h Paris par défaut, configurable par pro et par élève.
-- Préférence : 'instant' (email à chaque message) | 'digest' (récap 18h) | 'off'

-- ── 1. Table conversations ──────────────────────────────────────────────────
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  type            text not null check (type in ('client', 'cours')),
  client_id       uuid references public.clients(id) on delete cascade,
  cours_id        uuid references public.cours(id) on delete cascade,
  titre           text,                       -- override affichage (sinon dérivé du client/cours)
  last_message_at timestamptz default now(),
  archived        boolean default false,
  created_at      timestamptz default now(),
  -- Contraintes de cohérence : exactly-one parmi client_id/cours_id selon type
  constraint conv_target_coherent check (
    (type = 'client' and client_id is not null and cours_id is null) or
    (type = 'cours'  and cours_id  is not null and client_id is null)
  )
);

-- Unicité : 1 seule conversation par (profile, type, cible)
create unique index if not exists conv_uq_client
  on public.conversations (profile_id, client_id)
  where type = 'client';
create unique index if not exists conv_uq_cours
  on public.conversations (profile_id, cours_id)
  where type = 'cours';

create index if not exists conv_profile_last_msg_idx
  on public.conversations (profile_id, last_message_at desc);

alter table public.conversations enable row level security;

-- Pro : CRUD complet sur ses conversations
create policy "Pro CRUD ses conversations"
  on public.conversations for all
  using (profile_id = auth.uid());

-- Élève : peut lire les conversations 1-to-1 dont il est le client
-- (rattachement via client.email = auth.user.email)
create policy "Eleve lit ses conversations 1-to-1"
  on public.conversations for select
  using (
    type = 'client'
    and client_id in (
      select c.id from public.clients c
      where lower(c.email) = lower(auth.email())
    )
  );

-- Élève : peut lire les conversations groupe-cours auxquelles il est inscrit
create policy "Eleve lit conversations cours auxquels inscrit"
  on public.conversations for select
  using (
    type = 'cours'
    and cours_id in (
      select p.cours_id from public.presences p
      join public.clients c on c.id = p.client_id
      where lower(c.email) = lower(auth.email())
    )
  );


-- ── 2. Table messages ───────────────────────────────────────────────────────
create table if not exists public.messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.conversations(id) on delete cascade,
  sender_type         text not null check (sender_type in ('pro', 'eleve', 'system')),
  sender_profile_id   uuid references public.profiles(id) on delete set null,
  sender_client_id    uuid references public.clients(id) on delete set null,
  message_type        text not null default 'text' check (message_type in ('text', 'photo', 'file', 'system')),
  content             text,
  media_url           text,                  -- chemin storage (Vercel Blob URL ou Supabase path)
  media_urls          text[] default '{}',   -- pour multi-photos
  -- Référence à un objet IziSolo partagé (cours, offre, abo)
  shared_ref_type     text check (shared_ref_type in ('cours', 'offre', 'abonnement')),
  shared_ref_id       uuid,
  -- Annonce groupée : tag pour grouper les fan-out d'une même annonce
  announce_batch_id   uuid,
  created_at          timestamptz default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

create index if not exists messages_announce_batch_idx
  on public.messages (announce_batch_id)
  where announce_batch_id is not null;

alter table public.messages enable row level security;

-- Pro : voit les messages de ses conversations
create policy "Pro voit messages ses conversations"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations where profile_id = auth.uid()
    )
  );

-- Pro : peut insérer dans ses conversations (en tant que pro)
create policy "Pro insere messages ses conversations"
  on public.messages for insert
  with check (
    sender_type in ('pro', 'system')
    and conversation_id in (
      select id from public.conversations where profile_id = auth.uid()
    )
  );

-- Élève : voit messages des conversations qu'il a le droit de voir
create policy "Eleve voit messages ses conversations"
  on public.messages for select
  using (
    conversation_id in (
      select c.id from public.conversations c
      where (
        c.type = 'client' and c.client_id in (
          select cl.id from public.clients cl where lower(cl.email) = lower(auth.email())
        )
      ) or (
        c.type = 'cours' and c.cours_id in (
          select p.cours_id from public.presences p
          join public.clients cl on cl.id = p.client_id
          where lower(cl.email) = lower(auth.email())
        )
      )
    )
  );

-- Élève : peut insérer en tant qu'élève dans ses conversations
create policy "Eleve insere messages ses conversations"
  on public.messages for insert
  with check (
    sender_type = 'eleve'
    and sender_client_id in (
      select cl.id from public.clients cl where lower(cl.email) = lower(auth.email())
    )
    and conversation_id in (
      select c.id from public.conversations c
      where (
        c.type = 'client' and c.client_id = messages.sender_client_id
      ) or (
        c.type = 'cours' and c.cours_id in (
          select p.cours_id from public.presences p
          where p.client_id = messages.sender_client_id
        )
      )
    )
  );

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;


-- ── 3. Table conversation_members (qui est dedans + suivi de lecture) ──────
-- Membres d'une conversation : permet de tracker last_read_at par participant
-- (pour calculer les non-lus côté chaque utilisateur).
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  -- Soit pro, soit élève (exactly one)
  profile_id      uuid references public.profiles(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete cascade,
  last_read_at    timestamptz default now(),
  notif_canal     text default 'digest' check (notif_canal in ('instant', 'digest', 'off')),
  joined_at       timestamptz default now(),
  primary key (conversation_id, profile_id, client_id),
  constraint cm_one_only check (
    (profile_id is not null and client_id is null) or
    (profile_id is null and client_id is not null)
  )
);

create index if not exists conv_members_profile_idx
  on public.conversation_members (profile_id) where profile_id is not null;
create index if not exists conv_members_client_idx
  on public.conversation_members (client_id) where client_id is not null;

alter table public.conversation_members enable row level security;

-- Pro voit/edit ses propres lignes
create policy "Pro CRUD ses members"
  on public.conversation_members for all
  using (profile_id = auth.uid());

-- Élève voit/edit ses propres lignes (via email match)
create policy "Eleve CRUD ses members"
  on public.conversation_members for all
  using (
    client_id in (
      select cl.id from public.clients cl where lower(cl.email) = lower(auth.email())
    )
  );


-- ── 4. Préférence notif globale par utilisateur ────────────────────────────
-- Le pro a un défaut sur son profil ; l'élève a sa propre prefs colonne sur clients.
alter table public.profiles
  add column if not exists notif_messagerie_canal text default 'digest'
    check (notif_messagerie_canal in ('instant', 'digest', 'off'));

alter table public.clients
  add column if not exists notif_messagerie_canal text default 'digest'
    check (notif_messagerie_canal in ('instant', 'digest', 'off'));

comment on column public.profiles.notif_messagerie_canal is
  'Préférence par défaut pour les notifs de nouveaux messages : instant (email immédiat) | digest (récap 18h) | off';
comment on column public.clients.notif_messagerie_canal is
  'Idem côté élève.';


-- ── 5. Trigger : maj last_message_at sur la conversation à chaque insert ───
create or replace function public.tr_messages_update_conv_last_msg()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists tr_messages_update_conv on public.messages;
create trigger tr_messages_update_conv
  after insert on public.messages
  for each row execute function public.tr_messages_update_conv_last_msg();


-- ── Notes ──────────────────────────────────────────────────────────────────
comment on table public.conversations is
  'Hub messagerie : conversations bidirectionnelles pro <-> elève (type=client) ou groupe pro -> élèves d''un cours (type=cours).';
comment on table public.messages is
  'Messages d''une conversation. Annonces groupées partagent announce_batch_id pour traçabilité.';
comment on table public.conversation_members is
  'Suivi lecture (last_read_at) + préférence notif par utilisateur et par conversation.';
