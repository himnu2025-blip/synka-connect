-- Ensure chat_sessions rows are created/updated whenever chat_messages are inserted
-- This fixes cases where clients insert messages but the session upsert fails.

CREATE OR REPLACE FUNCTION public.upsert_chat_session_from_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_sessions (
    session_id,
    status,
    message_count,
    started_at,
    last_message_at,
    ended_at,
    timeout_reason
  ) VALUES (
    NEW.session_id,
    'active',
    1,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.created_at, now()),
    NULL,
    NULL
  )
  ON CONFLICT (session_id)
  DO UPDATE SET
    status = 'active',
    message_count = public.chat_sessions.message_count + 1,
    last_message_at = COALESCE(NEW.created_at, now()),
    ended_at = NULL,
    timeout_reason = NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_message_insert ON public.chat_messages;

CREATE TRIGGER on_chat_message_insert
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.upsert_chat_session_from_message();

-- Backfill any existing chat_messages into chat_sessions (your table is currently empty)
INSERT INTO public.chat_sessions (session_id, status, message_count, started_at, last_message_at)
SELECT
  session_id,
  'active' as status,
  COUNT(*)::int as message_count,
  MIN(created_at) as started_at,
  MAX(created_at) as last_message_at
FROM public.chat_messages
GROUP BY session_id
ON CONFLICT (session_id)
DO UPDATE SET
  message_count = EXCLUDED.message_count,
  started_at = LEAST(public.chat_sessions.started_at, EXCLUDED.started_at),
  last_message_at = GREATEST(public.chat_sessions.last_message_at, EXCLUDED.last_message_at);
