-- First delete orphaned tags where user_id doesn't exist in auth.users
DELETE FROM public.tags
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Now add foreign key constraint to tags table with cascade delete
ALTER TABLE public.tags
ADD CONSTRAINT tags_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;