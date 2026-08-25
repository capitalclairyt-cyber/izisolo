-- ============================================================================
-- MIGRATION v103 — Qui donne ce cours, et qui a le droit de le pointer
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================================
-- Lot 3b du chantier multi-prof. Deux colonnes, une conséquence :
--
--   cours.intervenant_id            → QUI donne cette séance
--   studio_membres.portee_pointage  → 'tous' | 'miens'
--
-- Décision Colin (2026-08-25) : la portée du pointage est un choix PAR MEMBRE.
-- Elle n'avait aucun sens tant qu'un cours n'avait pas d'intervenante — « les
-- siens » ne désignait rien. C'est cette migration qui lui donne un sens.
--
-- ⚠️ LA PORTÉE EST TENUE PAR LA BASE, pas seulement par l'écran. Le pointage
-- passe par la RPC `pointer_presence`, qui est en SECURITY INVOKER : elle
-- s'appuie donc sur la RLS de `presences`. Un écran qui cacherait le bouton
-- laisserait la route ouverte à qui sait ouvrir des devtools. On SÉPARE donc
-- la policy de `presences` en deux :
--   • LECTURE  : tout le studio (une prof doit voir le planning et les
--                inscrites, même sur les cours d'une collègue) ;
--   • ÉCRITURE : le studio ET, si sa portée vaut 'miens', seulement les
--                séances dont elle est l'intervenante.
-- Le propriétaire et quiconque en portée 'tous' ne voient aucune différence.
--
-- `intervenant_id` naît NULL partout : une séance sans intervenante désignée
-- reste pointable par tout le monde (c'est l'état de 100 % des séances
-- existantes, et le comportement d'avant). On ne ferme jamais rétroactivement
-- une porte qui était ouverte.
-- ============================================================================

-- 1. Qui donne la séance.
alter table public.cours
  add column if not exists intervenant_id uuid
  references public.studio_membres(id) on delete set null;

create index if not exists idx_cours_intervenant
  on public.cours (intervenant_id)
  where intervenant_id is not null;

-- 2. Jusqu'où va son pointage.
alter table public.studio_membres
  add column if not exists portee_pointage text not null default 'tous'
  check (portee_pointage in ('tous', 'miens'));

-- 3. Les séances qu'une personne a le droit de POINTER.
--    Renvoie tous les cours de ses studios quand sa portée vaut 'tous', et
--    seulement les siens (plus ceux sans intervenante) sinon.
drop function if exists public.mes_cours_pointables();

create function public.mes_cours_pointables()
returns setof uuid language sql stable security definer set search_path = public as $$
  select c.id
    from public.cours c
   where c.profile_id in (select public.mes_studios_staff())
     and (
       -- Portée 'tous' quelque part dans ce studio : rien ne la borne.
       exists (
         select 1 from public.studio_membres m
          where m.profile_id = c.profile_id
            and m.auth_user_id = auth.uid()
            and m.statut = 'actif'
            and (m.role = 'proprietaire' or coalesce(m.portee_pointage, 'tous') = 'tous')
       )
       -- Sinon : ses séances, plus celles que personne n'a prises en charge.
       or c.intervenant_id is null
       or c.intervenant_id in (
         select m.id from public.studio_membres m
          where m.auth_user_id = auth.uid() and m.statut = 'actif'
       )
     );
$$;

revoke all on function public.mes_cours_pointables() from public, anon;
grant execute on function public.mes_cours_pointables() to authenticated;

comment on function public.mes_cours_pointables() is
  'Séances qu''un membre a le droit de POINTER (lot 3b). Une séance sans intervenante reste pointable par tout le monde : on ne ferme jamais rétroactivement une porte ouverte.';

-- 4. `presences` : lecture large, écriture bornée par la portée.
--    Le nom « CRUD presences » disparaît au profit de deux policies explicites
--    (v91 puis v101 le portaient ; on remplace, on n'empile pas).
drop policy if exists "CRUD presences" on public.presences;
drop policy if exists "Pro lit les presences du studio" on public.presences;
drop policy if exists "Pro ecrit les presences qu'elle pointe" on public.presences;

create policy "Pro lit les presences du studio" on public.presences
  for select to authenticated
  using (profile_id in (select public.mes_studios_staff()));

create policy "Pro ecrit les presences qu'elle pointe" on public.presences
  for all to authenticated
  using (
    profile_id in (select public.mes_studios_staff())
    and (cours_id is null or cours_id in (select public.mes_cours_pointables()))
  )
  with check (
    profile_id in (select public.mes_studios_staff())
    and (cours_id is null or cours_id in (select public.mes_cours_pointables()))
  );

do $$
declare n_portee int;
begin
  select count(*) into n_portee from public.studio_membres where portee_pointage = 'miens';
  raise notice '✅ v103 : intervenant_id + portee_pointage en place (% membre(s) borné(s) à leurs séances)', n_portee;
end $$;

-- ── Sondes (lecture seule, après application) ───────────────────────────────
-- select count(*) from public.cours where intervenant_id is not null;
-- select tablename, policyname, cmd from pg_policies
--   where schemaname='public' and tablename='presences' order by policyname;
