-- Enable realtime for chat_sessions table
ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;