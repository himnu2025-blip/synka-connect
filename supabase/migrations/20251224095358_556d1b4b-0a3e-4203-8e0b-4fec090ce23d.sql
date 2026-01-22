-- Create a trigger function to automatically create profile and default card when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  slug_exists BOOLEAN;
  counter INT := 0;
  new_card_id UUID;
BEGIN
  -- Generate base slug from email
  base_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;
  
  -- Find a unique slug
  final_slug := base_slug || FLOOR(RANDOM() * 1000)::TEXT;
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE slug = final_slug) INTO slug_exists;
    EXIT WHEN NOT slug_exists;
    counter := counter + 1;
    final_slug := base_slug || FLOOR(RANDOM() * 10000)::TEXT;
    EXIT WHEN counter > 10; -- Safety limit
  END LOOP;
  
  -- Create profile with slug
  INSERT INTO public.profiles (user_id, email, full_name, phone, slug)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    final_slug
  );
  
  -- Create default card
  INSERT INTO public.cards (user_id, name, is_default, full_name, email, phone, layout, card_design)
  VALUES (
    NEW.id,
    'Personal',
    true,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'classic',
    'minimal'
  )
  RETURNING id INTO new_card_id;
  
  -- Create default email signature
  INSERT INTO public.email_signatures (user_id, name, html, is_selected)
  VALUES (
    NEW.id,
    'Default',
    '<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333;">
      <tr>
        <td style="border-left: 3px solid #4F46E5; padding-left: 15px; vertical-align: top;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td style="font-size: 18px; font-weight: bold; color: #1a1a1a; padding-bottom: 4px; text-align: left;">' || COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Your Name') || '</td></tr>
            <tr><td style="font-size: 12px; color: #333333; text-align: left;"><a href="mailto:' || COALESCE(NEW.email, '') || '" style="color: #4F46E5; text-decoration: none;">' || COALESCE(NEW.email, '') || '</a></td></tr>
          </table>
        </td>
      </tr>
    </table>',
    true
  );
  
  RETURN NEW;
END;
$$;

-- Drop the existing trigger if it exists (from previous migrations)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();