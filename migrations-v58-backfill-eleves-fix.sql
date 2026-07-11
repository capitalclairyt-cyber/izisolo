-- ============================================================
-- MIGRATION v58 — Backfill élèves fantômes, critères corrigés
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Le backfill de v57 matchait 0 profil : il exigeait `metier = ''`
-- et `encrypted_password IS NULL`, alors que le schéma v1 pose
-- metier DEFAULT 'yoga' (migrations.sql:19) sur TOUS les nouveaux
-- profils, et que GoTrue stocke '' (pas NULL) pour les comptes
-- créés sans mot de passe.
--
-- Critères v58 (cumulatifs) — un fantôme élève est un profil qui :
--   • n'a JAMAIS onboardé : studio_slug IS NULL (l'onboarding le
--     pose toujours) + studio_nom encore au défaut
--   • n'est pas un signup prof : pas de metadata `prenom` (le
--     /register la pose toujours dans options.data.prenom)
--   • n'a pas déjà choisi de devenir prof (role='prof' via
--     /api/eleve/compte)
--   • est élève quelque part : email présent dans `clients`
--   • ne possède aucune donnée de prof, pas de Stripe, pas free
-- Le trigger handle_new_user est déjà corrigé par v57 — ici on ne
-- refait QUE le backfill.
-- ============================================================

begin;

do $$
declare
  team_clause text := '';
  n_fantomes  int;
  emails_txt  text;
begin
  if to_regclass('public.team_members') is not null then
    team_clause := 'and not exists (select 1 from public.team_members tm where tm.user_id = p.id)';
  end if;

  execute format($sql$
    create temp table _fantomes_eleves_v58 on commit drop as
    select p.id, u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.studio_slug is null
      and coalesce(p.studio_nom, 'Mon Studio') in ('', 'Mon Studio')
      and coalesce(p.plan, 'solo') <> 'free'
      and p.stripe_customer_id is null
      and coalesce(u.raw_user_meta_data ->> 'prenom', '') = ''
      and coalesce(u.raw_user_meta_data ->> 'role', '') <> 'prof'
      and exists (select 1 from public.clients c  where lower(c.email) = lower(u.email))
      and not exists (select 1 from public.clients c2 where c2.profile_id = p.id)
      and not exists (select 1 from public.cours   co where co.profile_id = p.id)
      and not exists (select 1 from public.offres  o  where o.profile_id  = p.id)
      %s
  $sql$, team_clause);

  select count(*), string_agg(email, ', ' order by email)
    into n_fantomes, emails_txt
    from _fantomes_eleves_v58;

  raise notice '🔎 v58 : % fantôme(s) identifié(s) : %', n_fantomes, coalesce(emails_txt, '(aucun)');

  -- Tag role='eleve' sur les auth.users correspondants
  update auth.users u
     set raw_user_meta_data =
         coalesce(u.raw_user_meta_data, '{}'::jsonb) || '{"role": "eleve"}'::jsonb
   where u.id in (select id from _fantomes_eleves_v58);

  -- Purge des profils fantômes (aucune ligne enfant par construction)
  delete from public.profiles
   where id in (select id from _fantomes_eleves_v58);

  raise notice '✅ v58 : % fantôme(s) purgé(s) — % profils prof restants',
    n_fantomes, (select count(*) from public.profiles);
end $$;

commit;
