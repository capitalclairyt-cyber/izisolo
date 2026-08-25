-- ============================================================================
-- MIGRATION v101 — Fondations multi-prof : « le studio n'est plus l'utilisateur »
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================================
-- Lot 2 du chantier multi-prof (Colin, 2026-08-25). Le lot le plus dangereux
-- des quatre : il réécrit la RLS de tout l'espace prof. Rien n'est visible à
-- l'écran, et c'est VOULU — un lot de fondations se prouve, il ne se montre pas.
--
-- ── L'invariant, qui ne bouge pas ───────────────────────────────────────────
-- `profiles.id` RESTE l'identifiant du studio. Aucune donnée ne migre, aucune
-- colonne `profile_id` ne change de sens, les 17 RPC continuent de marcher.
-- Mesuré avant de décider : 164 sites applicatifs filtrent sur
-- `profile_id = user.id`, 134 `auth.uid()` vivent dans les policies. Déplacer
-- l'identité du studio aurait été un chantier de plusieurs semaines pour un
-- résultat identique.
--
-- Ce qui change tient en une phrase : « le studio n'est plus l'utilisateur
-- connecté ». Une table d'appartenance, un helper, et les policies passent de
--   profile_id = auth.uid()
-- à
--   profile_id in (select mes_studios_staff())
--
-- ── Pourquoi ça ne casse rien le jour de l'application ──────────────────────
-- Le backfill donne à chaque profil existant UNE ligne `proprietaire`, et le
-- helper renvoie TOUJOURS le studio dont on est soi-même le profil. Donc pour
-- 100 % des comptes actuels, `mes_studios_staff()` = `{auth.uid()}` : la
-- nouvelle règle est mot pour mot l'ancienne. C'est le test que la migration
-- est bonne — si quoi que ce soit change pour une prof seule, c'est un bug.
--
-- ⚠️ LE PIÈGE À NE JAMAIS OUBLIER : il existe DEUX familles de helpers aux
-- noms voisins, et les confondre ouvrirait tout le studio à ses élèves.
--     mes_studio_ids()      (v91) = les studios où je suis CLIENTE  → bras ÉLÈVE
--     mes_studios_staff()   (v101) = les studios où je TRAVAILLE    → bras PROF
-- Le second ne lit JAMAIS la table `clients`. Aucun bras élève n'est touché
-- par cette migration : les policies « Eleve lit … » de v91 restent mot pour
-- mot ce qu'elles étaient, et les policies anon (v25/v31/v36) aussi.
--
-- ── Ce que la RLS fait, et ce qu'elle ne fait pas ───────────────────────────
-- La RLS assure l'isolation par STUDIO (le tenant). Les PERMISSIONS par
-- personne (pointer, gérer l'argent, écrire aux élèves) arrivent au lot 3.
-- Deux d'entre elles sont déjà câblées ici, parce qu'elles gardent des tables
-- où lire EST déjà sensible et qu'un composant navigateur interroge Supabase
-- en direct — l'UI ne peut donc pas les protéger :
--     argent_voir  → paiements, factures, factures_paiements, declarations_urssaf
--     messagerie   → conversations, messages, conversation_members, mailings,
--                    messages_envoyes, templates_communication
-- Le rôle `proprietaire` passe toujours. Aujourd'hui tout le monde est
-- propriétaire : aucun changement. Lot 3 : les mêmes noms exactement, définis
-- dans lib/studio-membre.js (PERMISSIONS) — SQL et JS doivent parler la même
-- langue, sinon l'écran et la base diront deux choses différentes.
--
-- APRÈS APPLICATION :
--   1. node scripts/verifier-selects.mjs
--   2. node scripts/proof-studio-membres.mjs   (isolation + membre réel)
--   3. npx playwright test tests/e2e/parcours-eleve-live.spec.js --workers=1
--   4. Naviguer le dashboard du compte démo (agenda, élèves, pointage, revenus)
-- ============================================================================

-- ── 1. La table d'appartenance ──────────────────────────────────────────────

create table if not exists public.studio_membres (
  id            uuid primary key default gen_random_uuid(),

  -- LE studio (= profiles.id). Jamais l'utilisateur.
  profile_id    uuid not null references public.profiles(id) on delete cascade,

  -- La personne. NULL tant qu'elle est invitée sans avoir encore de compte :
  -- l'invitation part par email, la liaison se fait à la première connexion.
  auth_user_id  uuid references auth.users(id) on delete cascade,
  email         text not null,

  role          text not null default 'prof'
                check (role in ('proprietaire', 'admin', 'prof')),

  -- { "pointer": true, "argent_voir": false, … } — vocabulaire figé dans
  -- lib/studio-membre.js. Le propriétaire ignore ce champ (il a tout).
  permissions   jsonb not null default '{}'::jsonb,

  statut        text not null default 'invite'
                check (statut in ('invite', 'actif', 'revoque')),

  invite_par    uuid references auth.users(id) on delete set null,
  invite_at     timestamptz not null default now(),
  accepte_at    timestamptz,
  revoque_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- Une personne, une seule ligne par studio — que la liaison soit faite ou non.
create unique index if not exists idx_studio_membres_email
  on public.studio_membres (profile_id, lower(email));
create unique index if not exists idx_studio_membres_user
  on public.studio_membres (profile_id, auth_user_id)
  where auth_user_id is not null;
-- La lecture chaude : « à quels studios appartient cette personne ? »
create index if not exists idx_studio_membres_actifs
  on public.studio_membres (auth_user_id, statut)
  where auth_user_id is not null;

alter table public.studio_membres enable row level security;

-- Volontairement SANS le helper : une policy sur studio_membres qui appelle
-- une fonction lisant studio_membres est une question de récursion qu'on
-- préfère ne pas avoir à se poser. Le propriétaire gère, chacun lit sa ligne.
drop policy if exists "studio_membres proprietaire" on public.studio_membres;
create policy "studio_membres proprietaire" on public.studio_membres
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "studio_membres lit sa ligne" on public.studio_membres;
create policy "studio_membres lit sa ligne" on public.studio_membres
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

-- ── 2. Le helper ────────────────────────────────────────────────────────────
-- SETOF uuid + `in (select …)` : la forme uuid[] avait échoué en 42883 lors de
-- v91 (Postgres lit `= any((select f()))` comme une sous-requête et compare la
-- LIGNE au uuid). DROP d'abord : on ne peut pas changer la signature d'une
-- fonction par CREATE OR REPLACE.
drop function if exists public.mes_studios_staff(text);
drop function if exists public.mes_studios_staff();

create function public.mes_studios_staff(p_perm text default null)
returns setof uuid language sql stable security definer set search_path = public as $$
  -- (a) MON studio, toujours, quelle que soit la permission demandée.
  --     Filet d'auto-réparation délibéré : même sans ligne studio_membres
  --     (backfill incomplet, compte né entre deux déploiements, trigger raté),
  --     une prof ne peut JAMAIS perdre l'accès à son propre studio. C'est ce
  --     filet qui rend cette migration sûre à appliquer un mardi matin.
  select id from public.profiles where id = auth.uid()
  union
  -- (b) Les studios où je suis membre ACTIF, avec la permission demandée.
  select m.profile_id
    from public.studio_membres m
   where m.auth_user_id = auth.uid()
     and m.statut = 'actif'
     and (p_perm is null
          or m.role = 'proprietaire'
          or coalesce((m.permissions ->> p_perm)::boolean, false));
$$;

revoke all on function public.mes_studios_staff(text) from public, anon;
grant execute on function public.mes_studios_staff(text) to authenticated;

comment on function public.mes_studios_staff(text) is
  'Studios où l''utilisateur TRAVAILLE (bras prof). Ne lit jamais clients — à ne pas confondre avec mes_studio_ids() (v91), qui rend les studios où il est ÉLÈVE.';

-- ── 3. Backfill : chaque profil existant devient propriétaire du sien ───────
insert into public.studio_membres (profile_id, auth_user_id, email, role, permissions, statut, accepte_at)
select p.id, p.id, coalesce(u.email, p.email_contact, ''), 'proprietaire', '{}'::jsonb, 'actif', now()
  from public.profiles p
  left join auth.users u on u.id = p.id
on conflict do nothing;

-- ── 4. Le trigger de création de compte ─────────────────────────────────────
-- Deux ajouts à v57 :
--   • `role = 'membre'` (une prof invitée qui crée son compte) ne doit PAS
--     recevoir un studio à elle. Sans cette ligne, elle se fabriquerait un
--     studio fantôme en essai 14 j : l'incident Bruno à l'identique.
--   • une nouvelle prof reçoit sa ligne `proprietaire` tout de suite. Le
--     helper sait s'en passer (cf. filet ci-dessus), mais mieux vaut que la
--     table dise la vérité.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.raw_user_meta_data ->> 'role' in ('eleve', 'membre') then
    return new;
  end if;

  insert into public.profiles (id, prenom, email_contact)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    new.email
  );

  insert into public.studio_membres (profile_id, auth_user_id, email, role, statut, accepte_at)
  values (new.id, new.id, coalesce(new.email, ''), 'proprietaire', 'actif', now())
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- ── 5. Les policies du bras PROF ────────────────────────────────────────────
-- Noms repris À L'IDENTIQUE de v91 (relevé pg_policies) : on remplace, on
-- n'empile pas. Les policies « Eleve … » et les policies anon ne sont PAS
-- touchées — les toucher serait le seul moyen d'ouvrir un studio à ses élèves.

-- 5a. Tables chaudes
drop policy if exists "CRUD presences" on public.presences;
create policy "CRUD presences" on public.presences
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD clients" on public.clients;
create policy "CRUD clients" on public.clients
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD cours" on public.cours;
create policy "CRUD cours" on public.cours
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD abonnements" on public.abonnements;
create policy "CRUD abonnements" on public.abonnements
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

-- 5b. L'argent — gardé par `argent_voir` dès maintenant : un composant
-- navigateur interroge Supabase en direct, l'UI ne protège donc rien.
drop policy if exists "CRUD paiements" on public.paiements;
create policy "CRUD paiements" on public.paiements
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_voir')));

drop policy if exists factures_select_own on public.factures;
create policy factures_select_own on public.factures
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_voir')));

drop policy if exists factures_paiements_select_own on public.factures_paiements;
create policy factures_paiements_select_own on public.factures_paiements
  for select to authenticated
  using (exists (
    select 1 from public.factures f
    where f.id = factures_paiements.facture_id
      and f.profile_id in (select public.mes_studios_staff('argent_voir'))
  ));

drop policy if exists declarations_urssaf_own on public.declarations_urssaf;
create policy declarations_urssaf_own on public.declarations_urssaf
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff('argent_voir')))
  with check (profile_id in (select public.mes_studios_staff('argent_voir')));

-- 5c. La messagerie — gardée par `messagerie` (mêmes raisons que l'argent :
-- des conversations 1-à-1 avec des élèves).
drop policy if exists "Pro CRUD ses conversations" on public.conversations;
create policy "Pro CRUD ses conversations" on public.conversations
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff('messagerie')));

drop policy if exists "Pro voit messages ses conversations" on public.messages;
create policy "Pro voit messages ses conversations" on public.messages
  for select to authenticated
  using (conversation_id in (
    select id from public.conversations
    where profile_id in (select public.mes_studios_staff('messagerie'))
  ));

drop policy if exists "Pro insere messages ses conversations" on public.messages;
create policy "Pro insere messages ses conversations" on public.messages
  for insert to authenticated
  with check (
    sender_type in ('pro', 'system')
    and conversation_id in (
      select id from public.conversations
      where profile_id in (select public.mes_studios_staff('messagerie'))
    )
  );

drop policy if exists "Pro CRUD members de ses conversations" on public.conversation_members;
create policy "Pro CRUD members de ses conversations" on public.conversation_members
  for all to authenticated
  using (conversation_id in (
    select id from public.conversations
    where profile_id in (select public.mes_studios_staff('messagerie'))
  ))
  with check (conversation_id in (
    select id from public.conversations
    where profile_id in (select public.mes_studios_staff('messagerie'))
  ));

drop policy if exists reactions_select on public.messages_reactions;
create policy reactions_select on public.messages_reactions
  for select to authenticated
  using (exists (
    select 1 from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = messages_reactions.message_id
      and (cm.profile_id in (select public.mes_studios_staff('messagerie'))
           or cm.client_id in (select public.mes_client_ids()))
  ));
-- reactions_insert / reactions_delete : inchangées. Leur `user_id` est la
-- personne qui réagit, pas le studio — `auth.uid()` y est le bon test.

drop policy if exists "CRUD mailings" on public.mailings;
create policy "CRUD mailings" on public.mailings
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff('messagerie')));

drop policy if exists "CRUD messages_envoyes" on public.messages_envoyes;
create policy "CRUD messages_envoyes" on public.messages_envoyes
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff('messagerie')))
  with check (profile_id in (select public.mes_studios_staff('messagerie')));

drop policy if exists "Pro gere ses templates" on public.templates_communication;
create policy "Pro gere ses templates" on public.templates_communication
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff('messagerie')))
  with check (profile_id in (select public.mes_studios_staff('messagerie')));

-- 5d. Le reste de l'espace prof (isolation par studio, sans permission fine)
drop policy if exists "Pro gere ses cas a traiter" on public.cas_a_traiter;
create policy "Pro gere ses cas a traiter" on public.cas_a_traiter
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()))
  with check (profile_id in (select public.mes_studios_staff()));

drop policy if exists "Pro CRUD demandes essai" on public.cours_essai_demandes;
create policy "Pro CRUD demandes essai" on public.cours_essai_demandes
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()))
  with check (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD notifications" on public.notifications;
create policy "CRUD notifications" on public.notifications
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()))
  with check (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD offres" on public.offres;
create policy "CRUD offres" on public.offres
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "Pro gere sa liste d'attente" on public.liste_attente;
create policy "Pro gere sa liste d'attente" on public.liste_attente
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()))
  with check (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD regles" on public.regles;
create policy "CRUD regles" on public.regles
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD lieux" on public.lieux;
create policy "CRUD lieux" on public.lieux
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD recurrences" on public.recurrences;
create policy "CRUD recurrences" on public.recurrences
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD evenements" on public.evenements;
create policy "CRUD evenements" on public.evenements
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "CRUD inscriptions_evenements" on public.inscriptions_evenements;
create policy "CRUD inscriptions_evenements" on public.inscriptions_evenements
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "Pro gere ses videos" on public.videos_cours;
create policy "Pro gere ses videos" on public.videos_cours
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()))
  with check (profile_id in (select public.mes_studios_staff()));

drop policy if exists "Pro voit notifs eleves" on public.notifications_eleves;
create policy "Pro voit notifs eleves" on public.notifications_eleves
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "Pro CRUD ses sondages" on public.sondages_planning;
create policy "Pro CRUD ses sondages" on public.sondages_planning
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "Pro CRUD ses creneaux" on public.sondages_creneaux;
create policy "Pro CRUD ses creneaux" on public.sondages_creneaux
  for all to authenticated
  using (sondage_id in (
    select id from public.sondages_planning
    where profile_id in (select public.mes_studios_staff())
  ));

drop policy if exists "Pro lit reponses ses sondages" on public.sondages_reponses;
create policy "Pro lit reponses ses sondages" on public.sondages_reponses
  for select to authenticated
  using (creneau_id in (
    select c.id from public.sondages_creneaux c
    join public.sondages_planning s on s.id = c.sondage_id
    where s.profile_id in (select public.mes_studios_staff())
  ));

drop policy if exists "demandes_offre_prof_select" on public.demandes_offre;
create policy "demandes_offre_prof_select" on public.demandes_offre
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff()));

drop policy if exists "demandes_offre_prof_update" on public.demandes_offre;
create policy "demandes_offre_prof_update" on public.demandes_offre
  for update to authenticated
  using (profile_id in (select public.mes_studios_staff()))
  with check (profile_id in (select public.mes_studios_staff()));

drop policy if exists "liens_pointage proprietaire" on public.liens_pointage;
create policy "liens_pointage proprietaire" on public.liens_pointage
  for all to authenticated
  using (profile_id in (select public.mes_studios_staff()))
  with check (profile_id in (select public.mes_studios_staff()));

-- 5e. Le profil du studio
-- LECTURE : un membre doit lire les réglages du studio (règles d'annulation,
-- vocabulaire, plan). ÉCRITURE : gardée par `parametres` — changer le portail
-- ou la politique d'annulation n'est pas un geste de remplaçante.
drop policy if exists "Voir son profil" on public.profiles;
create policy "Voir son profil" on public.profiles
  for select to authenticated
  using (id in (select public.mes_studios_staff()));

drop policy if exists "Modifier son profil" on public.profiles;
create policy "Modifier son profil" on public.profiles
  for update to authenticated
  using (id in (select public.mes_studios_staff('parametres')));

-- NON TOUCHÉES, volontairement :
--   • push_subscriptions : `user_id` est l'appareil d'UNE personne, pas le
--     studio. Un membre reçoit ses propres push, jamais ceux du propriétaire.
--   • support_tickets : le fil d'assistance du propriétaire avec IziSolo.
--   • toutes les policies « Eleve … » (v91) et anon (v25/v31/v36).

do $$
declare n_membres int; n_profils int;
begin
  select count(*) into n_membres from public.studio_membres;
  select count(*) into n_profils from public.profiles;
  raise notice '✅ v101 : % membre(s) pour % profil(s) — chaque studio a son propriétaire', n_membres, n_profils;
  if n_membres < n_profils then
    raise warning '⚠️ % profil(s) sans ligne membre — le filet du helper les couvre, mais vérifier', n_profils - n_membres;
  end if;
end $$;

-- ── Sondes (lecture seule, après application) ───────────────────────────────
-- select tablename, policyname, roles, cmd from pg_policies
--   where schemaname = 'public' order by tablename, policyname;
-- select role, statut, count(*) from public.studio_membres group by 1, 2;
