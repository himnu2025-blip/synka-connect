-- Drop and recreate the generate_order_number function to support ORG prefix for orange_upgrade
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year text;
  v_random text;
  v_order_number text;
  v_exists boolean;
  v_prefix text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  -- Use ORG prefix for orange_upgrade, CRD for card orders
  IF NEW.product_type = 'orange_upgrade' THEN
    v_prefix := 'ORG';
  ELSE
    v_prefix := 'CRD';
  END IF;
  
  -- Generate unique 4-character alphanumeric code
  LOOP
    v_random := upper(substring(md5(random()::text) from 1 for 4));
    v_order_number := v_year || '-' || v_prefix || '-' || v_random;
    
    -- Check if this order number already exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = v_order_number) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  NEW.order_number := v_order_number;
  RETURN NEW;
END;
$function$;