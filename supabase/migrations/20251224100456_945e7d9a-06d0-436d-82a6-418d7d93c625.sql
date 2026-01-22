-- Fix email_signatures foreign key to reference auth.users
ALTER TABLE public.email_signatures DROP CONSTRAINT IF EXISTS email_signatures_user_id_fkey;
ALTER TABLE public.email_signatures ADD CONSTRAINT email_signatures_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix contacts foreign key to reference auth.users
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_owner_id_fkey;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;