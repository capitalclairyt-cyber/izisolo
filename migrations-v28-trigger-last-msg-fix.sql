-- Migration v28 : Fix trigger last_message_at (SECURITY DEFINER) + backfill
--
-- BUG : le trigger v24 tr_messages_update_conv s'exécute avec les droits du
-- caller. Quand un élève insère un message, le trigger essaie d'UPDATE la
-- conversation pour rafraîchir last_message_at, mais l'élève n'est PAS owner
-- de la conv — la policy "Pro CRUD ses conversations" bloque l'UPDATE
-- silencieusement. Conséquence : last_message_at reste figé à la date du
-- premier message, et la conv ne remonte pas dans la liste après réponse élève.
--
-- Fix : SECURITY DEFINER + search_path pour bypass RLS dans le trigger.
-- Plus backfill : recalculer last_message_at depuis le max(created_at) des
-- messages de chaque conversation.

-- 1. Recréer la fonction en SECURITY DEFINER
create or replace function public.tr_messages_update_conv_last_msg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

-- (Le trigger lui-même ne change pas — il pointe sur la même fonction,
--  qui a maintenant les bons privilèges.)

-- 2. Backfill : recalculer last_message_at depuis le max(messages.created_at)
update public.conversations c
set last_message_at = sub.max_created
from (
  select conversation_id, max(created_at) as max_created
  from public.messages
  group by conversation_id
) sub
where c.id = sub.conversation_id
  and c.last_message_at < sub.max_created;

do $$
declare n_fixed int;
begin
  select count(*) into n_fixed
  from public.conversations c
  join (
    select conversation_id, max(created_at) as max_created
    from public.messages
    group by conversation_id
  ) sub on c.id = sub.conversation_id
  where c.last_message_at = sub.max_created;
  raise notice '✅ % conversations avec last_message_at synchronisé', n_fixed;
end $$;
