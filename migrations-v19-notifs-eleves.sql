-- Migration v19 : Notifications automatiques aux élèves (email + SMS)
--
-- Architecture (cohérente avec Stripe Payment Link) : chaque pro configure
-- son propre Twilio (SID + token + phone). Mélutek ne touche pas l'argent
-- ni les SMS — on facture juste la fonctionnalité via le plan Pro.
--
-- 3 triggers livrés :
--   1) Cours annulé par le studio (immédiat, déclenché côté pro)
--   2) Annulation tardive (immédiat, déclenché dans /api/portail/.../annuler)
--   3) Crédits faibles + expiration abo (cron quotidien 8h UTC)
--
-- Idempotence : table notifications_eleves avec UNIQUE (client_id, type,
-- related_id) pour éviter les doublons (ex: ne pas re-envoyer "crédits
-- faibles" tous les jours pour le même abonnement).

-- ── 1. Toggles + config Twilio sur le profil pro
alter table public.profiles
  add column if not exists notifs_eleves           jsonb default '{
    "cours_annule":        {"email": true,  "sms": false},
    "annulation_tardive":  {"email": true,  "sms": false},
    "credits_faibles":     {"email": true,  "sms": false},
    "expiration_abo":      {"email": true,  "sms": false}
  }'::jsonb,
  add column if not exists twilio_account_sid      text,
  add column if not exists twilio_auth_token       text,
  add column if not exists twilio_phone_number     text;

-- ── 2. Historique des notifs envoyées (idempotence + debug + RGPD audit)
create table if not exists public.notifications_eleves (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references public.profiles(id) on delete cascade not null,
  client_id    uuid references public.clients(id)  on delete cascade,
  email        text,
  telephone    text,
  type         text not null,    -- 'cours_annule', 'annulation_tardive',
                                  -- 'credits_faibles', 'expiration_abo'
  channel      text not null check (channel in ('email', 'sms')),
  statut       text not null check (statut in ('sent', 'failed', 'skipped')),
  sujet        text,
  related_id   uuid,              -- cours_id ou abonnement_id selon le type
  error_message text,
  sent_at      timestamptz default now(),
  -- Idempotence : 1 notif par (client, type, related_id, channel) max
  unique (client_id, type, related_id, channel)
);

create index if not exists notifications_eleves_profile_sent_idx
  on public.notifications_eleves (profile_id, sent_at desc);

create index if not exists notifications_eleves_type_idx
  on public.notifications_eleves (type, sent_at desc);

alter table public.notifications_eleves enable row level security;

-- Pro voit l'historique de ses propres notifs
create policy "Pro voit notifs eleves"
  on public.notifications_eleves for select
  using (profile_id = auth.uid());
