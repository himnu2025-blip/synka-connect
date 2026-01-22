-- Create trigger to remove user from deleted_users when they sign up again with the same email
CREATE OR REPLACE FUNCTION public.handle_user_revival()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the email from the new user
  user_email := NEW.email;
  
  -- If the email exists in deleted_users, remove it (user is "revived")
  IF user_email IS NOT NULL THEN
    DELETE FROM public.deleted_users WHERE email = user_email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_revival ON auth.users;

-- Create trigger that fires when a new user signs up
CREATE TRIGGER on_auth_user_revival
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_revival();