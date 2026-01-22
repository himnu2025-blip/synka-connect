-- Drop the problematic RLS policy that references auth.users
DROP POLICY IF EXISTS "Only verified users" ON public.profiles;

-- Update the create_default_card trigger function to use correct column
CREATE OR REPLACE FUNCTION public.create_default_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO cards (user_id, name, is_default, layout, created_at, updated_at)
    VALUES (NEW.user_id, 'My Card', true, 'dark-professional', now(), now());
  RETURN NEW;
END;
$$;

-- Add a simpler policy for users to access their own profile
-- The existing policies "Users can view their own profile", "Users can insert their own profile",
-- and "Users can update their own profile" already cover user_id based access