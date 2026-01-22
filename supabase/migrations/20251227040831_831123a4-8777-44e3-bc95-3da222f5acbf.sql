-- Create support_queries table for Saira chatbot
CREATE TABLE public.support_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  mobile TEXT,
  query_text TEXT NOT NULL,
  query_summary TEXT,
  is_user BOOLEAN DEFAULT false,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Needs Human Assistance', 'Assigned', 'Done')),
  is_from_user BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_support_queries_session ON public.support_queries(session_id);
CREATE INDEX idx_support_queries_status ON public.support_queries(status);
CREATE INDEX idx_support_queries_created_at ON public.support_queries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.support_queries ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for public chat)
CREATE POLICY "Anyone can insert support queries"
ON public.support_queries
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view all queries
CREATE POLICY "Admins can view all support queries"
ON public.support_queries
FOR SELECT
USING (is_admin(auth.uid()));

-- Policy: Admins can update queries
CREATE POLICY "Admins can update support queries"
ON public.support_queries
FOR UPDATE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_support_queries_updated_at
BEFORE UPDATE ON public.support_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();