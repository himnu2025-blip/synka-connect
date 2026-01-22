-- Add columns for single document with custom name
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS document_name text,
ADD COLUMN IF NOT EXISTS document_url text;