-- Add synka_user_id column to contacts for dynamic photo linking
-- When a contact is created via Synka Exchange, store the original user's ID
-- This allows us to always fetch their CURRENT photo, not a stale copy

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS synka_user_id uuid;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_contacts_synka_user_id ON public.contacts(synka_user_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.contacts.synka_user_id IS 'References the Synka user ID for dynamic photo/data updates. When set, photo displays from their current default card instead of static photo_url.';