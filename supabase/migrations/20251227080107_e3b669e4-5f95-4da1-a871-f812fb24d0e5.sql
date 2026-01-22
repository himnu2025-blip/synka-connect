-- Add work_status column to chat_sessions for admin tracking
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS work_status text NOT NULL DEFAULT 'open';

-- Update the trigger to NOT override status when session is ended/timeout
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
    timeout_reason,
    work_status
  ) VALUES (
    NEW.session_id,
    'active',
    1,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.created_at, now()),
    NULL,
    NULL,
    'open'
  )
  ON CONFLICT (session_id)
  DO UPDATE SET
    -- Only set to active if NOT already ended/timeout
    status = CASE 
      WHEN public.chat_sessions.status IN ('ended', 'timeout') THEN public.chat_sessions.status
      ELSE 'active'
    END,
    message_count = public.chat_sessions.message_count + 1,
    last_message_at = COALESCE(NEW.created_at, now()),
    -- Don't clear ended_at/timeout_reason if already set
    ended_at = CASE 
      WHEN public.chat_sessions.status IN ('ended', 'timeout') THEN public.chat_sessions.ended_at
      ELSE NULL
    END,
    timeout_reason = CASE 
      WHEN public.chat_sessions.status IN ('ended', 'timeout') THEN public.chat_sessions.timeout_reason
      ELSE NULL
    END;

  RETURN NEW;
END;
$$;