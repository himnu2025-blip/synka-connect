-- Clean up orphaned cards first (user no longer exists in auth.users)
DELETE FROM public.cards WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned profiles
DELETE FROM public.profiles WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned email_signatures
DELETE FROM public.email_signatures WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Now fix the cards foreign key to reference auth.users instead of profiles
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_user_id_fkey;

-- Add the correct foreign key referencing auth.users
ALTER TABLE public.cards ADD CONSTRAINT cards_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;