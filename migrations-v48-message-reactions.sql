-- v48 — Réactions emoji sur les messages de la messagerie
--
-- Permet aux pros et élèves de réagir à un message avec un emoji
-- (👍 ❤️ 😂 etc.) à la WhatsApp/Slack. Toggle : cliquer une réaction
-- déjà mise = la retirer.

CREATE TABLE IF NOT EXISTS public.messages_reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_type    TEXT NOT NULL CHECK (user_type IN ('pro', 'eleve')),
  -- profile_id si pro, client_id si eleve
  user_id      UUID NOT NULL,
  emoji        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  -- Un user ne peut mettre la même réaction qu'une fois sur un message
  UNIQUE (message_id, user_type, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS messages_reactions_message_idx
  ON public.messages_reactions (message_id);
CREATE INDEX IF NOT EXISTS messages_reactions_user_idx
  ON public.messages_reactions (user_type, user_id);

-- RLS : un user voit toutes les réactions des messages auxquels il a accès
-- (via conversation_members) et peut ajouter/retirer ses propres réactions.
ALTER TABLE public.messages_reactions ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les membres d'une conversation voient les réactions de ses messages
DROP POLICY IF EXISTS reactions_select ON public.messages_reactions;
CREATE POLICY reactions_select ON public.messages_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = messages_reactions.message_id
        AND ((cm.user_type = 'pro' AND cm.profile_id = auth.uid())
          OR (cm.user_type = 'eleve' AND cm.client_id IN (
            SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
          )))
    )
  );

-- Insert : un user ne peut insérer que des réactions à son nom
DROP POLICY IF EXISTS reactions_insert ON public.messages_reactions;
CREATE POLICY reactions_insert ON public.messages_reactions
  FOR INSERT TO authenticated WITH CHECK (
    (user_type = 'pro' AND user_id = auth.uid())
    OR (user_type = 'eleve' AND user_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
    ))
  );

-- Delete : un user peut retirer ses propres réactions
DROP POLICY IF EXISTS reactions_delete ON public.messages_reactions;
CREATE POLICY reactions_delete ON public.messages_reactions
  FOR DELETE TO authenticated USING (
    (user_type = 'pro' AND user_id = auth.uid())
    OR (user_type = 'eleve' AND user_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
    ))
  );

COMMENT ON TABLE public.messages_reactions IS
  'Réactions emoji sur les messages (WhatsApp/Slack style). Unique par (message, user, emoji).';
