-- Migration v87 : Messagerie support prof ↔ IziSolo (2026-08-19)
--
-- La prof écrit à l'équipe IziSolo depuis SA messagerie (conversation épinglée
-- « Équipe IziSolo ») ; l'équipe répond depuis /admin/messagerie. Option B
-- validée par Colin : le widget feedback reste SÉPARÉ, aucune liaison auto.
--
-- Modèle : une conversation type='support' par prof (client_id/cours_id NULL),
-- réponses admin en messages sender_type='izisolo' (sender_profile_id NULL).
--
-- ⚠️ Piège v19/v77 (CHECKs périmés qui avalent les inserts en silence) :
-- les CHECKs RÉELS ont été vérifiés dans migrations-v24-messagerie-hub.sql —
-- contraintes INLINE non nommées → noms auto Postgres `conversations_type_check`
-- et `messages_sender_type_check` ; + la contrainte NOMMÉE `conv_target_coherent`
-- (exactly-one client_id/cours_id) qui rejetterait aussi une conv support.
-- Une SONDE par insert témoin clôt la migration : si un CHECK résiduel bloque
-- encore, elle échoue FORT ici plutôt qu'en silence en prod.
--
-- Re-runnable.

-- ── 1. conversations.type accepte 'support' ────────────────────────────────
alter table public.conversations
  drop constraint if exists conversations_type_check;
alter table public.conversations
  add constraint conversations_type_check
  check (type in ('client', 'cours', 'support'));

-- ── 2. Cohérence des cibles : support = AUCUNE cible ───────────────────────
alter table public.conversations
  drop constraint if exists conv_target_coherent;
alter table public.conversations
  add constraint conv_target_coherent check (
    (type = 'client'  and client_id is not null and cours_id is null) or
    (type = 'cours'   and cours_id  is not null and client_id is null) or
    (type = 'support' and client_id is null     and cours_id is null)
  );

-- ── 3. messages.sender_type accepte 'izisolo' ──────────────────────────────
alter table public.messages
  drop constraint if exists messages_sender_type_check;
alter table public.messages
  add constraint messages_sender_type_check
  check (sender_type in ('pro', 'eleve', 'system', 'izisolo'));

-- ── 4. Suivi de lecture côté admin ─────────────────────────────────────────
-- NULL = jamais lu (anti-pattern gravé § 12 : un champ qui trace une ACTION
-- naît NULL, jamais DEFAULT now() — cf. incident « Lu fantôme » de v24).
alter table public.conversations
  add column if not exists support_admin_last_read_at timestamptz;

comment on column public.conversations.support_admin_last_read_at is
  'Messagerie support (v87) : dernière lecture du fil par l''équipe IziSolo. NULL = jamais lu.';

-- ── 5. Une seule conversation support par prof ─────────────────────────────
create unique index if not exists conv_uq_support
  on public.conversations (profile_id)
  where type = 'support';

-- ── 6. SONDE par insert témoin (leçon v77 : seul un insert réel prouve) ────
do $$
declare
  pid uuid;
  cid uuid;
begin
  -- Un profil SANS conversation support (évite le heurt avec conv_uq_support)
  select p.id into pid
  from public.profiles p
  where not exists (
    select 1 from public.conversations c
    where c.profile_id = p.id and c.type = 'support'
  )
  limit 1;

  if pid is null then
    raise notice '⚠️ sonde v87 sautée : aucun profil disponible (base vide ?)';
    return;
  end if;

  insert into public.conversations (profile_id, type, titre)
  values (pid, 'support', 'sonde v87 — témoin')
  returning id into cid;

  insert into public.messages (conversation_id, sender_type, content)
  values (cid, 'izisolo', 'sonde v87 — témoin');

  -- Ménage : la cascade emporte le message témoin.
  delete from public.conversations where id = cid;

  raise notice '✅ sonde v87 OK : type ''support'' + sender ''izisolo'' acceptés par les CHECKs réels';
end $$;
