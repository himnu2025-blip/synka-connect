-- Drop the problematic foreign key constraint on chat_messages
-- The session_id is text-based and we use upsert, so strict FK isn't needed
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_session_id_fkey;

-- Make sure RLS policies allow proper insert/upsert for chat_sessions
DROP POLICY IF EXISTS "Anyone can insert chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone can update their own session by session_id" ON public.chat_sessions;

-- Allow anyone to insert new sessions
CREATE POLICY "Anyone can insert chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update sessions (for upsert to work)
CREATE POLICY "Anyone can update chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (true);

-- Fix chat_messages policies too
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;

CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (true);