-- ============================================================================
-- MIGRATION v91 — RLS × performance (AUDIT-PERF-2026, cat. 2.3, annexe C)
-- ----------------------------------------------------------------------------
-- Deux maux corrigés sur TOUTES les policies chaudes :
--   1. `auth.uid()` / `auth.email()` NUS = réévalués PAR LIGNE. La forme
--      `(select auth.uid())` les fige en InitPlan (1 évaluation par requête).
--   2. Le bras élève « clients par email » = sous-requête qui seq-scannait la
--      table clients ENTIÈRE (278 028 seq scans constatés le 2026-08-19).
--      Remplacé par des helpers SECURITY DEFINER STABLE + l'index
--      idx_clients_lower_email (v89) → un `= ANY(initplan)` indexable.
--
-- Bonus sécurité : les policies élève étaient à rôles {public} avec
-- `coalesce(auth.email(), '')` → une fiche à email '' aurait été lisible par
-- la clé anon (sonde du 2026-08-19 : 0 fiche concernée, trou théorique).
-- Tout passe `TO authenticated` : l'anon n'évalue plus rien ici. Les policies
-- anon dédiées (v25/v31/v36, « Public lit … portail actif ») ne sont PAS
-- touchées : elles restent la défense de la clé anon publique.
--
-- Élargissement ASSUMÉ (cohérent v83) : les helpers matchent par
-- clients.auth_user_id (FK douce posée au login) EN PLUS de l'email — une
-- élève dont la prof a corrigé l'email de fiche garde l'accès à son espace,
-- exactement comme resoudreFicheEleve() côté code.
--
-- Noms de policies = relevé pg_policies EXACT du 2026-08-19 (annexe A3).
-- Re-runnable : DROP POLICY IF EXISTS + CREATE partout. Le batch du SQL
-- Editor s'exécute en une transaction : aucune fenêtre sans policy.
--
-- APRÈS APPLICATION :
--   1. node scripts/verifier-selects.mjs
--   2. Le walkthrough élève réel : npx playwright test tests/e2e/parcours-eleve-live.spec.js --workers=1
--   3. Naviguer le dashboard du compte démo (agenda, élèves, pointage, messagerie)
--   4. Supabase Advisor → « auth_rls_initplan » doit passer au vert
-- ============================================================================

-- ── C0. Helpers ──────────────────────────────────────────────────────────────

-- Fiches de l'utilisateur connecté : FK douce v83 D'ABORD, email en secours.
-- SECURITY DEFINER coupe la récursion RLS (la sous-requête clients ne repaye
-- pas la RLS de clients) ; STABLE = 1 évaluation par requête.
create or replace function public.mes_client_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}'::uuid[])
  from public.clients
  where auth_user_id = auth.uid()
     or (email is not null and email <> ''
         and lower(email) = lower(coalesce(auth.email(), '')));
$$;
revoke all on function public.mes_client_ids() from public;
grant execute on function public.mes_client_ids() to authenticated;

create or replace function public.mes_studio_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct profile_id), '{}'::uuid[])
  from public.clients
  where auth_user_id = auth.uid()
     or (email is not null and email <> ''
         and lower(email) = lower(coalesce(auth.email(), '')));
$$;
revoke all on function public.mes_studio_ids() from public;
grant execute on function public.mes_studio_ids() to authenticated;

-- Cours où l'élève a une présence (conversations de groupe + messages).
create or replace function public.mes_cours_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct p.cours_id), '{}'::uuid[])
  from public.presences p
  where p.client_id = any (public.mes_client_ids()) and p.cours_id is not null;
$$;
revoke all on function public.mes_cours_ids() from public;
grant execute on function public.mes_cours_ids() to authenticated;

-- ── C1. Les 5 tables chaudes ─────────────────────────────────────────────────

-- presences (pointage, revenus, RPC presences_par_eleve, espace élève)
drop policy if exists "CRUD presences" on public.presences;
create policy "CRUD presences" on public.presences
  for all to authenticated
  using (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses presences" on public.presences;
create policy "Eleve lit ses presences" on public.presences
  for select to authenticated
  using (client_id = any ((select public.mes_client_ids())));

-- paiements
drop policy if exists "CRUD paiements" on public.paiements;
create policy "CRUD paiements" on public.paiements
  for all to authenticated
  using (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses paiements" on public.paiements;
create policy "Eleve lit ses paiements" on public.paiements
  for select to authenticated
  using (client_id = any ((select public.mes_client_ids())));

-- clients (referme aussi le quirk anon « email vide » de v26)
drop policy if exists "CRUD clients" on public.clients;
create policy "CRUD clients" on public.clients
  for all to authenticated
  using (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses fiches client" on public.clients;
create policy "Eleve lit ses fiches client" on public.clients
  for select to authenticated
  using (id = any ((select public.mes_client_ids())));

-- cours
drop policy if exists "CRUD cours" on public.cours;
create policy "CRUD cours" on public.cours
  for all to authenticated
  using (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit cours de ses studios" on public.cours;
create policy "Eleve lit cours de ses studios" on public.cours
  for select to authenticated
  using (profile_id = any ((select public.mes_studio_ids())));

-- abonnements
drop policy if exists "CRUD abonnements" on public.abonnements;
create policy "CRUD abonnements" on public.abonnements
  for all to authenticated
  using (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses abonnements" on public.abonnements;
create policy "Eleve lit ses abonnements" on public.abonnements
  for select to authenticated
  using (client_id = any ((select public.mes_client_ids())));

-- ── C2. Messagerie (empruntée par l'API RLS ET le moteur Realtime) ──────────

drop policy if exists "Pro CRUD ses conversations" on public.conversations;
create policy "Pro CRUD ses conversations" on public.conversations
  for all to authenticated
  using (profile_id = (select auth.uid()));
drop policy if exists "Eleve lit ses conversations 1-to-1" on public.conversations;
create policy "Eleve lit ses conversations 1-to-1" on public.conversations
  for select to authenticated
  using (type = 'client' and client_id = any ((select public.mes_client_ids())));
drop policy if exists "Eleve lit conversations cours auxquels inscrit" on public.conversations;
create policy "Eleve lit conversations cours auxquels inscrit" on public.conversations
  for select to authenticated
  using (type = 'cours' and cours_id = any ((select public.mes_cours_ids())));
-- NB : type='support' (v87) reste invisible élève par construction — aucun
-- bras élève ne le couvre.

drop policy if exists "Pro voit messages ses conversations" on public.messages;
create policy "Pro voit messages ses conversations" on public.messages
  for select to authenticated
  using (conversation_id in (
    select id from public.conversations where profile_id = (select auth.uid())
  ));
drop policy if exists "Eleve voit messages ses conversations" on public.messages;
create policy "Eleve voit messages ses conversations" on public.messages
  for select to authenticated
  using (conversation_id in (
    select c.id from public.conversations c
    where (c.type = 'client' and c.client_id = any ((select public.mes_client_ids())))
       or (c.type = 'cours'  and c.cours_id  = any ((select public.mes_cours_ids())))
  ));
drop policy if exists "Pro insere messages ses conversations" on public.messages;
create policy "Pro insere messages ses conversations" on public.messages
  for insert to authenticated
  with check (
    sender_type in ('pro', 'system')
    and conversation_id in (
      select id from public.conversations where profile_id = (select auth.uid())
    )
  );
drop policy if exists "Eleve insere messages ses conversations" on public.messages;
create policy "Eleve insere messages ses conversations" on public.messages
  for insert to authenticated
  with check (
    sender_type = 'eleve'
    and sender_client_id = any ((select public.mes_client_ids()))
    and conversation_id in (
      select c.id from public.conversations c
      where (c.type = 'client' and c.client_id = messages.sender_client_id)
         or (c.type = 'cours'  and c.cours_id in (
               select p.cours_id from public.presences p
               where p.client_id = messages.sender_client_id
             ))
    )
  );

drop policy if exists "Pro CRUD members de ses conversations" on public.conversation_members;
create policy "Pro CRUD members de ses conversations" on public.conversation_members
  for all to authenticated
  using (conversation_id in (
    select id from public.conversations where profile_id = (select auth.uid())
  ))
  with check (conversation_id in (
    select id from public.conversations where profile_id = (select auth.uid())
  ));
drop policy if exists "Eleve CRUD ses members" on public.conversation_members;
create policy "Eleve CRUD ses members" on public.conversation_members
  for all to authenticated
  using (client_id = any ((select public.mes_client_ids())));

drop policy if exists reactions_select on public.messages_reactions;
create policy reactions_select on public.messages_reactions
  for select to authenticated
  using (exists (
    select 1 from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = messages_reactions.message_id
      and (cm.profile_id = (select auth.uid())
           or cm.client_id = any ((select public.mes_client_ids())))
  ));
drop policy if exists reactions_insert on public.messages_reactions;
create policy reactions_insert on public.messages_reactions
  for insert to authenticated
  with check (
       (user_type = 'pro'   and user_id = (select auth.uid()))
    or (user_type = 'eleve' and user_id = any ((select public.mes_client_ids())))
  );
drop policy if exists reactions_delete on public.messages_reactions;
create policy reactions_delete on public.messages_reactions
  for delete to authenticated
  using (
       (user_type = 'pro'   and user_id = (select auth.uid()))
    or (user_type = 'eleve' and user_id = any ((select public.mes_client_ids())))
  );

-- ── C3. Policies pro-only : (select auth.uid()) + TO authenticated ──────────
-- (les deux premières tournent à CHAQUE chargement de page dashboard)

drop policy if exists "Pro gere ses cas a traiter" on public.cas_a_traiter;
create policy "Pro gere ses cas a traiter" on public.cas_a_traiter
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Pro CRUD demandes essai" on public.cours_essai_demandes;
create policy "Pro CRUD demandes essai" on public.cours_essai_demandes
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "CRUD notifications" on public.notifications;
create policy "CRUD notifications" on public.notifications
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "CRUD offres" on public.offres;
create policy "CRUD offres" on public.offres
  for all to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Pro gere sa liste d'attente" on public.liste_attente;
create policy "Pro gere sa liste d'attente" on public.liste_attente
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "CRUD regles" on public.regles;
create policy "CRUD regles" on public.regles
  for all to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "CRUD lieux" on public.lieux;
create policy "CRUD lieux" on public.lieux
  for all to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "CRUD recurrences" on public.recurrences;
create policy "CRUD recurrences" on public.recurrences
  for all to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "CRUD evenements" on public.evenements;
create policy "CRUD evenements" on public.evenements
  for all to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "CRUD inscriptions_evenements" on public.inscriptions_evenements;
create policy "CRUD inscriptions_evenements" on public.inscriptions_evenements
  for all to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "CRUD mailings" on public.mailings;
create policy "CRUD mailings" on public.mailings
  for all to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "CRUD messages_envoyes" on public.messages_envoyes;
create policy "CRUD messages_envoyes" on public.messages_envoyes
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Pro gere ses templates" on public.templates_communication;
create policy "Pro gere ses templates" on public.templates_communication
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Pro gere ses videos" on public.videos_cours;
create policy "Pro gere ses videos" on public.videos_cours
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Pro voit notifs eleves" on public.notifications_eleves;
create policy "Pro voit notifs eleves" on public.notifications_eleves
  for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Pro CRUD ses sondages" on public.sondages_planning;
create policy "Pro CRUD ses sondages" on public.sondages_planning
  for all to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "Pro CRUD ses creneaux" on public.sondages_creneaux;
create policy "Pro CRUD ses creneaux" on public.sondages_creneaux
  for all to authenticated
  using (sondage_id in (
    select id from public.sondages_planning where profile_id = (select auth.uid())
  ));

drop policy if exists "Pro lit reponses ses sondages" on public.sondages_reponses;
create policy "Pro lit reponses ses sondages" on public.sondages_reponses
  for select to authenticated
  using (creneau_id in (
    select c.id from public.sondages_creneaux c
    join public.sondages_planning s on s.id = c.sondage_id
    where s.profile_id = (select auth.uid())
  ));

-- support_tickets : le filtre RÉEL en prod est profile_id (relevé A3)
drop policy if exists "Users can view own tickets" on public.support_tickets;
create policy "Users can view own tickets" on public.support_tickets
  for select to authenticated
  using ((select auth.uid()) = profile_id);
drop policy if exists "Users can create own tickets" on public.support_tickets;
create policy "Users can create own tickets" on public.support_tickets
  for insert to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists "push: gerer les siens" on public.push_subscriptions;
create policy "push: gerer les siens" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists factures_select_own on public.factures;
create policy factures_select_own on public.factures
  for select to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists factures_paiements_select_own on public.factures_paiements;
create policy factures_paiements_select_own on public.factures_paiements
  for select to authenticated
  using (exists (
    select 1 from public.factures f
    where f.id = factures_paiements.facture_id
      and f.profile_id = (select auth.uid())
  ));

drop policy if exists "Voir son profil" on public.profiles;
create policy "Voir son profil" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
drop policy if exists "Modifier son profil" on public.profiles;
create policy "Modifier son profil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()));

-- ── Sondes (lecture seule, après application) ────────────────────────────────
-- select tablename, policyname, roles, cmd from pg_policies
--   where schemaname='public' order by tablename, policyname;
-- Attendu : plus aucune policy {public} sur les tables réécrites (que du
-- {authenticated}), les policies {anon} « Public lit … » inchangées.
