-- Create chat_sessions table (one row per chat session)
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  name text,
  email text,
  mobile text,
  is_user boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  message_count integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  timeout_reason text
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_chat_sessions_session_id ON public.chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX idx_chat_sessions_email ON public.chat_sessions(email);
CREATE INDEX idx_chat_sessions_mobile ON public.chat_sessions(mobile);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_sessions
CREATE POLICY "Anyone can insert chat sessions"
ON public.chat_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their own session by session_id"
ON public.chat_sessions FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all chat sessions"
ON public.chat_sessions FOR SELECT
USING (is_admin(auth.uid()));

-- RLS policies for chat_messages
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages FOR SELECT
USING (is_admin(auth.uid()));

-- Function to increment message count
CREATE OR REPLACE FUNCTION public.increment_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions 
  SET message_count = message_count + 1,
      last_message_at = now()
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-increment message count
CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_message_count();