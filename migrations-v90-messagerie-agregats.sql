-- ============================================================================
-- MIGRATION v90 — Agrégats messagerie + purges (AUDIT-PERF-2026, cat. 2.1/2.2/2.6)
-- ----------------------------------------------------------------------------
-- LE mur n°1 de l'audit : la liste des conversations faisait 2-3 requêtes PAR
-- conversation (jusqu'à ~300 requêtes par affichage) et le compteur non-lus
-- 1 requête PAR conversation — multipliés par les pollers. Ces RPC remplacent
-- les boucles par UN agrégat SQL chacune.
--
-- ⚠️ SÉCURITÉ : toutes ces fonctions sont SECURITY DEFINER (elles bypassent la
-- RLS) et ne sont accordées qu'à service_role. Les routes les appellent via le
-- client admin APRÈS avoir scoppé elles-mêmes les ids par le client RLS de
-- l'utilisateur. Ne JAMAIS les granter à anon/authenticated telles quelles.
--
-- Le code (lib/messagerie.js, route conversations, route unread) appelle ces
-- RPC et DÉGRADE sur les anciennes boucles si elles n'existent pas encore.
--
-- Re-runnable : oui. Après application : node scripts/verifier-selects.mjs
-- ============================================================================

-- ── 1. Stats par conversation (liste messagerie pro ET élève) ───────────────
-- Pour chaque conversation : non-lus du viewer, dernier message (aperçu),
-- last_read du membre élève (état ✓/✓✓ des annonces côté pro).
-- Sémantique STRICTEMENT identique aux boucles remplacées :
--   . non-lus = messages created_at > coalesce(last_read_at du viewer, epoch)
--               et sender_type <> viewer ; conv sans membre viewer = tout compte
--   . dernier message = le plus récent, tous types confondus
create or replace function public.conversations_stats(
  p_conversation_ids uuid[],
  p_viewer text,                       -- 'pro' | 'eleve'
  p_profile_id uuid default null,      -- si viewer = pro
  p_client_ids uuid[] default null     -- si viewer = eleve (toutes ses fiches)
)
returns table (
  conversation_id uuid,
  unread bigint,
  dernier_contenu text,
  dernier_sender text,
  dernier_type text,
  dernier_batch uuid,
  eleve_last_read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with membre as (
    select cm.conversation_id, max(cm.last_read_at) as last_read_at
    from public.conversation_members cm
    where cm.conversation_id = any (p_conversation_ids)
      and ((p_viewer = 'pro'   and cm.profile_id = p_profile_id)
        or (p_viewer = 'eleve' and cm.client_id = any (coalesce(p_client_ids, '{}'::uuid[]))))
    group by cm.conversation_id
  ),
  non_lus as (
    select m.conversation_id, count(*)::bigint as unread
    from public.messages m
    left join membre mb on mb.conversation_id = m.conversation_id
    where m.conversation_id = any (p_conversation_ids)
      and m.created_at > coalesce(mb.last_read_at, '1970-01-01'::timestamptz)
      and m.sender_type <> p_viewer
    group by m.conversation_id
  ),
  dernier as (
    select distinct on (m.conversation_id)
      m.conversation_id, m.content, m.sender_type, m.message_type,
      m.announce_batch_id
    from public.messages m
    where m.conversation_id = any (p_conversation_ids)
    order by m.conversation_id, m.created_at desc
  ),
  lecture_eleve as (
    select cm.conversation_id, max(cm.last_read_at) as eleve_last_read_at
    from public.conversation_members cm
    where cm.conversation_id = any (p_conversation_ids)
      and cm.client_id is not null
    group by cm.conversation_id
  )
  select
    ids.id,
    coalesce(nl.unread, 0),
    d.content,
    d.sender_type,
    d.message_type,
    d.announce_batch_id,
    le.eleve_last_read_at
  from unnest(p_conversation_ids) as ids(id)
  left join non_lus nl       on nl.conversation_id = ids.id
  left join dernier d        on d.conversation_id  = ids.id
  left join lecture_eleve le on le.conversation_id = ids.id;
$$;

revoke all on function public.conversations_stats(uuid[], text, uuid, uuid[]) from public;
grant execute on function public.conversations_stats(uuid[], text, uuid, uuid[]) to service_role;

-- ── 2. Total non-lus (badge cloche/nav, pollé) ───────────────────────────────
-- Miroir exact de countUnread : somme sur les conversations dont le viewer est
-- MEMBRE (une conv sans membre viewer ne compte pas dans le total — comme avant).
create or replace function public.messages_non_lus_total(
  p_viewer text,
  p_profile_id uuid default null,
  p_client_ids uuid[] default null
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.conversation_members cm
  join public.messages m on m.conversation_id = cm.conversation_id
  where ((p_viewer = 'pro'   and cm.profile_id = p_profile_id)
      or (p_viewer = 'eleve' and cm.client_id = any (coalesce(p_client_ids, '{}'::uuid[]))))
    and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
    and m.sender_type <> p_viewer;
$$;

revoke all on function public.messages_non_lus_total(text, uuid, uuid[]) from public;
grant execute on function public.messages_non_lus_total(text, uuid, uuid[]) to service_role;

-- ── 3. Purge de la liste d'attente des cours passés (cron expirations) ──────
-- L'ancien chemin sélectionnait les 5000 plus VIEUX cours (jamais supprimés)
-- et re-scannait donc les mêmes chaque nuit sans jamais atteindre les
-- nouveaux expirés (AUDIT-PERF cat 2.2). Le DELETE par jointure purge tout,
-- d'un coup, sans plafond.
create or replace function public.purger_liste_attente(p_cutoff date)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  delete from public.liste_attente la
  using public.cours c
  where c.id = la.cours_id
    and c.date < p_cutoff;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purger_liste_attente(date) from public;
grant execute on function public.purger_liste_attente(date) to service_role;

-- ── 4. Fiches par email (lookups globaux : pastille « aussi élève »,
--       /api/eleve/compte, route unread élève) ────────────────────────────────
-- Remplace les .ilike('email', …) SANS filtre studio (seq scan de toute la
-- table clients, sur des chemins pollés). S'appuie sur idx_clients_lower_email
-- (v89). ILIKE sans joker = égalité insensible à la casse → lower() = lower()
-- est iso-comportement.
create or replace function public.fiches_par_email(p_email text)
returns table (id uuid, profile_id uuid, prenom text, nom text, email text, statut text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.profile_id, c.prenom, c.nom, c.email, c.statut
  from public.clients c
  where c.email is not null and c.email <> ''
    and lower(c.email) = lower(p_email);
$$;

revoke all on function public.fiches_par_email(text) from public;
grant execute on function public.fiches_par_email(text) to service_role;

-- ── Sondes (lecture seule, après application) ────────────────────────────────
-- select public.messages_non_lus_total('pro', (select id from profiles limit 1), null);
-- select * from public.conversations_stats(array(select id from conversations limit 5), 'pro', (select profile_id from conversations limit 1), null);
-- select public.purger_liste_attente('1970-01-01');  -- 0 attendu (aucun cours avant 1970)
