-- v48 — Réactions emoji sur les messages de la messagerie
--
-- Permet aux pros et élèves de réagir à un message avec un emoji
-- (👍 ❤️ 😂 etc.) à la WhatsApp/Slack. Toggle : cliquer une réaction
-- déjà mise = la retirer.
--
-- Schéma compatible v24 (messagerie-hub) :
--   - conversation_members : profile_id XOR client_id (pas de user_type)
--   - les élèves sont matchés via lower(cl.email) = lower(auth.email())

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

ALTER TABLE public.messages_reactions ENABLE ROW LEVEL SECURITY;

-- ─── Lecture ──────────────────────────────────────────────────────────────
-- Tous les membres d'une conversation voient les réactions de ses messages.
-- On vérifie via conversation_members en testant les 2 cas (pro ou élève).
DROP POLICY IF EXISTS reactions_select ON public.messages_reactions;
CREATE POLICY reactions_select ON public.messages_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = messages_reactions.message_id
        AND (
          cm.profile_id = auth.uid()
          OR cm.client_id IN (
            SELECT cl.id
            FROM public.clients cl
            WHERE lower(cl.email) = lower(auth.email())
          )
        )
    )
  );

-- ─── Insert : un user ne peut ajouter qu'à son nom ────────────────────────
DROP POLICY IF EXISTS reactions_insert ON public.messages_reactions;
CREATE POLICY reactions_insert ON public.messages_reactions
  FOR INSERT TO authenticated WITH CHECK (
    (user_type = 'pro' AND user_id = auth.uid())
    OR (
      user_type = 'eleve'
      AND user_id IN (
        SELECT cl.id
        FROM public.clients cl
        WHERE lower(cl.email) = lower(auth.email())
      )
    )
  );

-- ─── Delete : un user peut retirer ses propres réactions ──────────────────
DROP POLICY IF EXISTS reactions_delete ON public.messages_reactions;
CREATE POLICY reactions_delete ON public.messages_reactions
  FOR DELETE TO authenticated USING (
    (user_type = 'pro' AND user_id = auth.uid())
    OR (
      user_type = 'eleve'
      AND user_id IN (
        SELECT cl.id
        FROM public.clients cl
        WHERE lower(cl.email) = lower(auth.email())
      )
    )
  );

COMMENT ON TABLE public.messages_reactions IS
  'Réactions emoji sur les messages (WhatsApp/Slack style). Unique par (message, user, emoji). user_type discrimine pro (user_id=profile_id) et eleve (user_id=client_id).';
