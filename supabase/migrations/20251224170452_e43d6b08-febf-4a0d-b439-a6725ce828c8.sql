-- Add PIN authentication columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS pin_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups on pin_locked_until
CREATE INDEX IF NOT EXISTS idx_profiles_pin_locked_until ON public.profiles(pin_locked_until) WHERE pin_locked_until IS NOT NULL;