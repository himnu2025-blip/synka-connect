-- Create cards table for multiple business cards per user
CREATE TABLE public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Personal',
  is_default BOOLEAN NOT NULL DEFAULT false,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  company TEXT,
  title TEXT,
  designation TEXT,
  website TEXT,
  linkedin TEXT,
  photo_url TEXT,
  logo_url TEXT,
  about TEXT,
  layout TEXT DEFAULT 'classic',
  card_design TEXT DEFAULT 'minimal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own cards"
ON public.cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards"
ON public.cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
ON public.cards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
ON public.cards FOR DELETE
USING (auth.uid() = user_id);

-- Public access for cards via profile slug
CREATE POLICY "Public can view default cards via slug"
ON public.cards FOR SELECT
USING (is_default = true);

-- Trigger for updated_at
CREATE TRIGGER update_cards_updated_at
BEFORE UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();