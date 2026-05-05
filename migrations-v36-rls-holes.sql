-- ═══════════════════════════════════════════════════════════════════════════
-- Migration v36 : combler les trous RLS détectés par audit sécurité 2026-05-05
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Audit du 2026-05-05 a révélé 2 catégories de trous, identiques au bug
-- v25 fixé par v31 :
--
-- 1) Policies SELECT publiques sans qualification de rôle (= TO public =
--    anon + authenticated) sur 3 tables. Conséquence : un user authentifié
--    sur SON dashboard peut lire les données de tous les autres studios.
--    Tables concernées : videos_cours, sondages_planning, sondages_creneaux.
--
-- 2) Tables `notifications` et `messages_envoyes` créées sans RLS du tout
--    (v10) → tout user authentifié peut lire/écrire les notifs et emails
--    envoyés des autres pros. Plus grave qu'un mauvais TO.
--
-- Cette migration restreint les 3 policies à TO anon ET active RLS+policies
-- standard sur les 2 tables manquantes.
--
-- Idempotent : DROP IF EXISTS + IF NOT EXISTS partout.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Restreindre les 3 policies SELECT publiques à `TO anon` uniquement
-- ═══════════════════════════════════════════════════════════════════════════

-- ── videos_cours (v18) ────────────────────────────────────────────────────
drop policy if exists "Lecture publique videos publiees" on public.videos_cours;
create policy "Lecture publique videos publiees"
  on public.videos_cours for select
  to anon
  using (publie = true);

-- ── sondages_planning (v23) ────────────────────────────────────────────────
drop policy if exists "Public lit sondages actifs" on public.sondages_planning;
create policy "Public lit sondages actifs"
  on public.sondages_planning for select
  to anon
  using (
    actif = true
    and (date_fin is null or date_fin >= current_date)
  );

-- ── sondages_creneaux (v23) ────────────────────────────────────────────────
drop policy if exists "Public lit creneaux des sondages actifs" on public.sondages_creneaux;
create policy "Public lit creneaux des sondages actifs"
  on public.sondages_creneaux for select
  to anon
  using (
    sondage_id in (
      select id from public.sondages_planning
      where actif = true
        and (date_fin is null or date_fin >= current_date)
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Activer RLS + policies CRUD sur les tables sans RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- ── notifications (v10) ────────────────────────────────────────────────────
-- Notifications du pro (alertes dashboard, à ne pas confondre avec la table
-- `notifications_eleves` qui est déjà sécurisée).
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'notifications') then
    alter table public.notifications enable row level security;
    drop policy if exists "CRUD notifications" on public.notifications;
    create policy "CRUD notifications"
      on public.notifications for all
      using (profile_id = auth.uid())
      with check (profile_id = auth.uid());
  end if;
end $$;

-- ── messages_envoyes (v10) ─────────────────────────────────────────────────
-- Trace des emails / SMS envoyés par le pro à ses élèves.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'messages_envoyes') then
    alter table public.messages_envoyes enable row level security;
    drop policy if exists "CRUD messages_envoyes" on public.messages_envoyes;
    create policy "CRUD messages_envoyes"
      on public.messages_envoyes for all
      using (profile_id = auth.uid())
      with check (profile_id = auth.uid());
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Vérif
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  n_anon int;
  n_rls int;
begin
  -- Compte les policies "Public/Lecture" qui sont bien restreintes à anon
  select count(*) into n_anon
  from pg_policies
  where schemaname = 'public'
    and (policyname ilike 'Public lit%' or policyname ilike 'Lecture publique%')
    and 'anon' = any(roles);

  -- Compte les tables qui ont maintenant RLS activée
  select count(*) into n_rls
  from pg_tables
  where schemaname = 'public'
    and tablename in ('notifications', 'messages_envoyes')
    and rowsecurity = true;

  raise notice '✅ v36 : % policies publiques restreintes anon, % tables (notifications, messages_envoyes) RLS activée', n_anon, n_rls;
end $$;
