-- ============================================================================
-- MIGRATION v89 — Fondations performance (audit AUDIT-PERF-2026.md, cat. 1)
-- ----------------------------------------------------------------------------
-- Décisions Colin 2026-08-19 (soir du passage Supabase Pro/Micro) :
--   1. RPC places_occupees : comptage des inscrits par cours EN SQL (formule
--      v74), pour les jauges du portail public et du formulaire d'essai.
--      Motif : le code chargeait les LIGNES presences via .in(240 ids) sans
--      limite → cap PostgREST 1000 silencieux → jauges FAUSSES dès un studio
--      bien rempli (bible §12). L'agrégat renvoie 1 ligne PAR COURS (≤ 240),
--      jamais 1 ligne par présence. Le code appelle la RPC et DÉGRADE sur
--      l'ancien chemin (chunké + paginé) tant que la migration n'est pas là.
--   2. DROP de clients_unique_nom_prenom (posé par fix-doublons-clients.sql
--      étape 5 « optionnelle », époque crise des doublons) : deux VRAIES
--      homonymes ne pouvaient pas coexister dans un studio (23505 à la résa,
--      l'essai, l'import CSV). La vraie stratégie anti-doublons est en place
--      depuis : UNIQUE email v53 + détection lib/doublons.js + fusion v78.
--   3. Index de l'annexe B de l'audit : FK sans index, colonnes de date des
--      crons, colonne vivante des récurrences, lower(email) pour la RLS.
--      Sans CONCURRENTLY : le SQL Editor exécute en transaction, et les
--      tables sont minuscules (lock de quelques ms). Si un jour ce fichier
--      est rejoué sur une grosse base : les IF NOT EXISTS le rendent inerte.
--
-- Re-runnable : oui (IF NOT EXISTS / OR REPLACE / IF EXISTS partout).
-- Après application : node scripts/verifier-selects.mjs
-- ============================================================================

-- ── 1. RPC places_occupees — formule v74, miroir SQL de lib/presences.js ────
-- (occupe une place ⇔ pas d'annulation tardive ET coalesce(statut_pointage,
--  'inscrit') ∉ (annule, declinee) — copie exacte du WHERE de reserver_place)
create or replace function public.places_occupees(p_cours_ids uuid[])
returns table (cours_id uuid, occupees bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.cours_id, count(*)::bigint as occupees
  from public.presences p
  where p.cours_id = any (p_cours_ids)
    and coalesce(p.annulation_tardive, false) = false
    and coalesce(p.statut_pointage, 'inscrit') not in ('annule', 'declinee')
  group by p.cours_id;
$$;

revoke all on function public.places_occupees(uuid[]) from public;
grant execute on function public.places_occupees(uuid[]) to anon, authenticated, service_role;

-- ── 2. Fin du verrou homonymes (décision Colin 2026-08-19) ──────────────────
drop index if exists public.clients_unique_nom_prenom;

-- ── 3. Index — impact fort ──────────────────────────────────────────────────
-- cours(date) seule : crons alertes (cours de demain) + expirations (purge
-- liste d'attente) balayent cross-studio ; idx_cours_date a profile_id en tête.
create index if not exists idx_cours_date_seule on public.cours (date);

-- La colonne VIVANTE des séries (idx_cours_recurrence porte recurrence_id,
-- jamais écrite — index mort confirmé par pg_stat le 2026-08-19 : 2 scans).
create index if not exists idx_cours_recurrence_parent
  on public.cours (recurrence_parent_id) where recurrence_parent_id is not null;

-- syncMembresCours (lib/messagerie.js) scanne par conversation_id nu à chaque
-- ouverture d'une conversation de groupe — aucun index existant utilisable
-- (les UNIQUE partiels exigent profile_id/client_id IS NOT NULL).
create index if not exists idx_conv_members_conversation
  on public.conversation_members (conversation_id);

-- FK ON DELETE SET NULL sans index : chaque suppression d'abonnement / fusion
-- de fiches (v78) seq-scannait paiements et messages.
create index if not exists idx_paiements_abonnement
  on public.paiements (abonnement_id) where abonnement_id is not null;
create index if not exists idx_messages_sender_client
  on public.messages (sender_client_id) where sender_client_id is not null;

-- Sert les policies RLS élève (lower(email) = lower(auth.email())) — la table
-- clients était la plus seq-scannée de la prod (278 028 scans / 29,3 M lignes
-- lues, pg_stat 2026-08-19). ⚠️ Les .ilike('email') du code ne l'utilisent
-- PAS (correctif code séparé, cat. 2.6 de l'audit).
create index if not exists idx_clients_lower_email
  on public.clients (lower(email)) where email is not null and email <> '';

-- ── 4. Index — impact moyen (crons + webhook + suppressions en masse) ───────
create index if not exists idx_abonnements_actifs_date_fin
  on public.abonnements (date_fin) where statut = 'actif';
create index if not exists idx_clients_prospects
  on public.clients (id) where statut = 'prospect';
create index if not exists idx_cas_presence
  on public.cas_a_traiter (presence_id) where presence_id is not null;
create index if not exists idx_cas_cours
  on public.cas_a_traiter (cours_id) where cours_id is not null;
create index if not exists idx_cas_client
  on public.cas_a_traiter (client_id) where client_id is not null;
create index if not exists idx_paiements_offre
  on public.paiements (offre_id) where offre_id is not null;

-- ── 5. Index — hygiène FK (fusion v78, suppressions de fiches/offres) ───────
create index if not exists idx_messages_envoyes_client
  on public.messages_envoyes (client_id) where client_id is not null;
create index if not exists idx_essai_demandes_client
  on public.cours_essai_demandes (client_id) where client_id is not null;
create index if not exists idx_essai_demandes_presence
  on public.cours_essai_demandes (presence_id) where presence_id is not null;
create index if not exists idx_sondages_reponses_client
  on public.sondages_reponses (client_id) where client_id is not null;
create index if not exists idx_liste_attente_client
  on public.liste_attente (client_id) where client_id is not null;
create index if not exists idx_abonnements_offre
  on public.abonnements (offre_id) where offre_id is not null;
create index if not exists idx_conversations_client
  on public.conversations (client_id) where client_id is not null;
create index if not exists idx_conversations_cours
  on public.conversations (cours_id) where cours_id is not null;

-- ── Sonde de vérification (lecture seule, à exécuter après) ─────────────────
-- select * from public.places_occupees(array(select id from public.cours limit 5));
-- select indexname from pg_indexes where schemaname='public' and indexname like 'idx_%' order by 1;
