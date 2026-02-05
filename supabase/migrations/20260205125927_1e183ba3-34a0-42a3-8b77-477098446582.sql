-- Create table for account deletion requests
CREATE TABLE public.deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  reference_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own deletion requests
CREATE POLICY "Users can insert their own deletion requests"
ON public.deletion_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
ON public.deletion_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all deletion requests
CREATE POLICY "Admins can view all deletion requests"
ON public.deletion_requests
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can update deletion requests
CREATE POLICY "Admins can update all deletion requests"
ON public.deletion_requests
FOR UPDATE
USING (is_admin(auth.uid()));

-- Function to generate unique reference number
CREATE OR REPLACE FUNCTION public.generate_deletion_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  v_random text;
  v_reference text;
  v_exists boolean;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  LOOP
    v_random := upper(substring(md5(random()::text) from 1 for 6));
    v_reference := 'DEL-' || v_year || '-' || v_random;
    
    SELECT EXISTS(SELECT 1 FROM deletion_requests WHERE reference_number = v_reference) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  NEW.reference_number := v_reference;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate reference number
CREATE TRIGGER set_deletion_reference
BEFORE INSERT ON public.deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.generate_deletion_reference();

-- Create index for scheduled deletions
CREATE INDEX idx_deletion_requests_scheduled ON public.deletion_requests(scheduled_deletion_at) WHERE status = 'pending';