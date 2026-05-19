-- migrations-v41-feedback.sql
-- Widget feedback in-app pour les premiers mois de lancement.
-- Capture rapide : type + message + URL + user_agent.
-- RLS service_role only (insertion via API auth, lecture via admin).

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'autre'
    CHECK (type IN ('bug', 'manque', 'confus', 'kiff', 'autre')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  url text,
  user_agent text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'triaged', 'resolved', 'wontfix')),
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status  ON public.feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user    ON public.feedback(user_id, created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
