-- Add onboarding fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'mycard-edit';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the onboarding tour';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current step in the onboarding tour';