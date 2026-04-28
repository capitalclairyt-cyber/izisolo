-- Migration v11 : Table support_tickets
-- Permet aux utilisateurs d'envoyer des tickets de support depuis l'app
-- Schéma anglais aligné avec app/api/support-ticket/route.js et app/api/admin/tickets/update/route.js

create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  user_email   text,
  subject      text,
  message      text not null,
  status       text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_reply  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at desc);

-- RLS : chaque user voit/insère ses propres tickets ; le service_role a tous les droits (admin)
alter table public.support_tickets enable row level security;

create policy "Users see own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Users insert own tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- Mise à jour automatique de updated_at
create or replace function public.update_support_ticket_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.update_support_ticket_updated_at();
