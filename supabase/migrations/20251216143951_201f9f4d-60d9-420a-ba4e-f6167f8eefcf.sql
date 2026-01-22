-- Add X position columns for photo and logo
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS face_x integer DEFAULT 50;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS logo_x integer DEFAULT 50;