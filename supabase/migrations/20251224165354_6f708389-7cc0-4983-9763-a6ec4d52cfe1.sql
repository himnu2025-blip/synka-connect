-- Update the trigger function to include profile data in the default card
CREATE OR REPLACE FUNCTION public.create_default_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO cards (user_id, name, is_default, layout, full_name, email, phone, whatsapp, created_at, updated_at)
    VALUES (
      NEW.user_id, 
      'My Card', 
      true, 
      'dark-professional', 
      NEW.full_name,
      NEW.email,
      NEW.phone,
      NEW.phone,
      now(), 
      now()
    );
  RETURN NEW;
END;
$function$;