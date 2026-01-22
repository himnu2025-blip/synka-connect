-- Add logo_y column for manual logo position adjustment
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS logo_y integer DEFAULT NULL;