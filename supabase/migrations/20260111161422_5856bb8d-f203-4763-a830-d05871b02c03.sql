-- Add social media columns to cards table
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS youtube text,
ADD COLUMN IF NOT EXISTS twitter text,
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS calendly text;