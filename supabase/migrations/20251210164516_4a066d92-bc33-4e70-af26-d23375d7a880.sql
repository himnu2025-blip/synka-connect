
-- Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS designation text,
ADD COLUMN IF NOT EXISTS card_design text DEFAULT 'minimal',
ADD COLUMN IF NOT EXISTS card_name text;

-- Create contact_templates table for email/whatsapp templates
CREATE TABLE public.contact_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'both')),
  body text NOT NULL,
  is_selected_for_email boolean DEFAULT false,
  is_selected_for_whatsapp boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on contact_templates
ALTER TABLE public.contact_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_templates
CREATE POLICY "Users can view their own templates"
ON public.contact_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
ON public.contact_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.contact_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.contact_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Create email_signatures table
CREATE TABLE public.email_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  html text NOT NULL,
  is_selected boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on email_signatures
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_signatures
CREATE POLICY "Users can view their own signatures"
ON public.email_signatures
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signatures"
ON public.email_signatures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signatures"
ON public.email_signatures
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signatures"
ON public.email_signatures
FOR DELETE
USING (auth.uid() = user_id);

-- Create contact_events junction table
CREATE TABLE public.contact_events (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, event_id)
);

-- Enable RLS on contact_events
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;

-- RLS policy for contact_events
CREATE POLICY "Users can manage their contact events"
ON public.contact_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.id = contact_events.contact_id
    AND contacts.owner_id = auth.uid()
  )
);

-- Add trigger for updated_at on contact_templates
CREATE TRIGGER update_contact_templates_updated_at
BEFORE UPDATE ON public.contact_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add designation column to contacts table if not exists
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS designation text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS linkedin text;
