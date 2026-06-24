ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_session_created
  ON public.messages (session_id, created_at DESC);
