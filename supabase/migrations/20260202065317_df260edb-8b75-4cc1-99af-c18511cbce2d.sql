-- Update the handle_new_user function to use dot separator for cleaner badge-like slugs
-- Format: saira.a1, saira.b2 instead of saira-a1, saira-b2
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  raw_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  slug_exists BOOLEAN;
  counter INT := 0;
  suffix TEXT;
  new_card_id UUID;
BEGIN
  -- Get name from metadata, fallback to email prefix
  raw_name := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Generate base slug: lowercase, only alphanumeric and hyphens, trim hyphens
  base_slug := LOWER(REGEXP_REPLACE(raw_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g'); -- spaces to hyphens
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g'); -- collapse multiple hyphens
  base_slug := TRIM(BOTH '-' FROM base_slug); -- trim leading/trailing hyphens
  
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;
  
  -- Truncate if too long (max 30 chars for base)
  IF LENGTH(base_slug) > 30 THEN
    base_slug := SUBSTRING(base_slug FROM 1 FOR 30);
    base_slug := TRIM(BOTH '-' FROM base_slug);
  END IF;
  
  -- First, try just the name without any suffix
  final_slug := base_slug;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE slug = final_slug) INTO slug_exists;
  
  IF NOT slug_exists THEN
    -- Great! The clean slug is available
    NULL; -- final_slug is already set
  ELSE
    -- Name taken, add badge-like suffix with dot: ".a1", ".b2", etc.
    counter := 0;
    LOOP
      counter := counter + 1;
      -- Generate 2-char alphanumeric suffix (e.g., "a1", "x9", "k3")
      suffix := CHR(97 + (counter % 26)) || (counter % 10)::TEXT; -- a0-z9 pattern
      final_slug := base_slug || '.' || suffix;  -- Use dot instead of hyphen
      
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE slug = final_slug) INTO slug_exists;
      EXIT WHEN NOT slug_exists;
      EXIT WHEN counter > 260; -- Safety limit (26 letters × 10 digits)
    END LOOP;
  END IF;
  
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