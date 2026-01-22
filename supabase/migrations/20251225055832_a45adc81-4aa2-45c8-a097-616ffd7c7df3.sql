-- Add unique constraint on email for deleted_users (with null handling)
CREATE UNIQUE INDEX IF NOT EXISTS deleted_users_email_unique ON public.deleted_users (email) WHERE email IS NOT NULL;

-- Create function to capture user data before deletion
CREATE OR REPLACE FUNCTION public.capture_deleted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Get profile data for the user being deleted
  SELECT full_name, email, created_at INTO v_profile
  FROM public.profiles
  WHERE user_id = OLD.id;

  -- Upsert into deleted_users - update if email exists, insert otherwise
  INSERT INTO public.deleted_users (user_id, name, email, created_at, deleted_at)
  VALUES (
    OLD.id,
    COALESCE(v_profile.full_name, OLD.raw_user_meta_data->>'full_name'),
    COALESCE(v_profile.email, OLD.email),
    COALESCE(v_profile.created_at, OLD.created_at),
    now()
  )
  ON CONFLICT (email) WHERE email IS NOT NULL
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    name = EXCLUDED.name,
    created_at = EXCLUDED.created_at,
    deleted_at = now();

  RETURN OLD;
END;
$$;

-- Create trigger on auth.users for before delete
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_deleted_user();