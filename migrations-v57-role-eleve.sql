-- ============================================================
-- MIGRATION v57 — Séparation comptes élève / prof (Sprint E)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Bug (AUDIT-REPRISE-2026-07.md §2) : chaque élève créé via le
-- portail (admin.createUser dans portail-magic-link / reserver)
-- déclenchait handle_new_user → ligne `profiles` + trial v33.
-- Chaque élève était donc en DB une "prof en essai 14 jours" :
-- pollution admin/Founding 100, risque d'emails de relance trial,
-- bascule élève→prof involontaire avec trial déjà consommé.
--
-- Correctif :
--   1. Le code passe désormais user_metadata { role: 'eleve' }
--      dans les 2 createUser du portail → handle_new_user skip.
--   2. Backfill : les profils fantômes existants sont supprimés
--      et leurs auth.users taggés role='eleve'.
--   3. Le parcours élève→prof volontaire (POST /api/eleve/compte)
--      passe role='prof' et recrée un profil avec trial NEUF.
-- ============================================================

begin;

-- ── 1. handle_new_user : ne plus créer de profil pour les élèves ──
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Élève créé via le portail (magic link / réservation) : pas de
  -- profil prof. Son espace vit dans `clients`, pas dans `profiles`.
  if new.raw_user_meta_data ->> 'role' = 'eleve' then
    return new;
  end if;

  insert into public.profiles (id, prenom, email_contact)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- ── 2. Identifier les profils fantômes élèves existants ──────────
-- Critères CUMULATIFS (volontairement stricts pour ne jamais toucher
-- une prof à onboarding incomplet ni un membre d'équipe invité) :
--   • jamais onboardé (pas de studio_nom réel, pas de metier)
--   • pas de plan free / pas de client Stripe
--   • créé sans mot de passe (admin.createUser du portail) et sans
--     metadata prenom (le signup prof passe toujours prenom)
--   • est bien élève quelque part (email présent dans `clients`)
--   • ne possède AUCUNE donnée de prof (clients/cours/offres)
--   • n'est pas membre d'équipe (team_members)
create temp table _fantomes_eleves on commit drop as
select p.id
from public.profiles p
join auth.users u on u.id = p.id
where coalesce(p.studio_nom, '') in ('', 'Mon Studio')
  and coalesce(p.metier, '') = ''
  and coalesce(p.plan, 'solo') <> 'free'
  and p.stripe_customer_id is null
  and u.encrypted_password is null
  and coalesce(u.raw_user_meta_data ->> 'prenom', '') = ''
  and exists (select 1 from public.clients c  where lower(c.email) = lower(u.email))
  and not exists (select 1 from public.clients      c2 where c2.profile_id = p.id)
  and not exists (select 1 from public.cours        co where co.profile_id = p.id)
  and not exists (select 1 from public.offres       o  where o.profile_id  = p.id)
  and not exists (select 1 from public.team_members tm where tm.user_id    = p.id);

-- ── 3. Tagger les auth.users correspondants role='eleve' ─────────
update auth.users u
   set raw_user_meta_data =
       coalesce(u.raw_user_meta_data, '{}'::jsonb) || '{"role": "eleve"}'::jsonb
 where u.id in (select id from _fantomes_eleves);

-- ── 4. Supprimer les profils fantômes ─────────────────────────────
-- Sans effet de bord : par construction (critères §2) ces profils ne
-- possèdent aucune ligne enfant. L'espace élève lit `clients`, la
-- messagerie élève key sur sender_client_id → rien ne casse.
delete from public.profiles
 where id in (select id from _fantomes_eleves);

-- ── Vérif ─────────────────────────────────────────────────────────
do $$
declare
  n_fantomes int;
  n_profils  int;
  n_eleves   int;
begin
  select count(*) into n_fantomes from _fantomes_eleves;
  select count(*) into n_profils  from public.profiles;
  select count(*) into n_eleves   from auth.users
   where raw_user_meta_data ->> 'role' = 'eleve';
  raise notice '✅ v57 : % fantômes purgés — % profils prof restants, % auth.users taggés eleve',
    n_fantomes, n_profils, n_eleves;
end $$;

commit;
