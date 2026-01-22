-- Add pending_followup JSONB column for delayed follow-up support
ALTER TABLE public.chat_session_memory 
ADD COLUMN IF NOT EXISTS pending_followup JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.chat_session_memory.pending_followup IS 'Stores pending follow-up {intent: string, question: string, expires_at: string} for idle-based sending';