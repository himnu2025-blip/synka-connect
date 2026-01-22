-- Fix search_path for generate_unique_slug function
CREATE OR REPLACE FUNCTION public.generate_unique_slug()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    new_slug := lower(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_slug = new_slug) INTO slug_exists;
    IF NOT slug_exists THEN
      RETURN new_slug;
    END IF;
  END LOOP;
END;
$$;

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;