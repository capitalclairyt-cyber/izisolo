-- ============================================================
-- MIGRATION v59 — Abonnements Web Push (notifications navigateur)
-- À exécuter dans le SQL Editor Supabase. RE-RUNNABLE.
-- ============================================================
-- Stocke les PushSubscription (endpoint + clés) des profs ET des élèves.
-- Tout est keyé sur user_id (auth.users) : un prof pousse via son profile_id
-- (= user_id), un élève via son compte auth (résolu depuis son email/fiche).
-- Un même user peut avoir plusieurs abonnements (plusieurs appareils).
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,                 -- dénormalisé (lower) : envoi élève direct
                                     -- sans listUsers (résolution par email)
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  role        text,                 -- 'prof' | 'eleve' (informatif)
  user_agent  text,
  created_at  timestamptz default now(),
  last_seen_at timestamptz default now()
);

-- Re-runnable : ajoute la colonne email si la table préexiste sans elle.
alter table public.push_subscriptions add column if not exists email text;

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_email_idx
  on public.push_subscriptions (lower(email));

alter table public.push_subscriptions enable row level security;

-- L'utilisateur gère ses propres abonnements (insert/select/delete via sa
-- session). L'envoi serveur passe par le service_role (hors RLS).
drop policy if exists "push: gerer les siens" on public.push_subscriptions;
create policy "push: gerer les siens"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Vérif ─────────────────────────────────────────────────────────────────
do $$
begin
  raise notice '✅ v59 : table push_subscriptions prête (% lignes)',
    (select count(*) from public.push_subscriptions);
end $$;
