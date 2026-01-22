-- Add columns for improved chatbot personality flow
-- followups_done: tracks which intents have already received follow-ups
-- ended: tracks if session has been gracefully ended (prevents zombie responses)
-- last_intent: tracks the most recent detected intent

ALTER TABLE public.chat_session_memory 
ADD COLUMN IF NOT EXISTS followups_done text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_intent text DEFAULT NULL;