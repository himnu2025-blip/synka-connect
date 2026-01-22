-- Add order_number column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text UNIQUE;

-- Drop existing status check constraint if it exists
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Create function to generate unique order number
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
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  -- Generate unique 4-character alphanumeric code
  LOOP
    v_random := upper(substring(md5(random()::text) from 1 for 4));
    v_order_number := v_year || '-CRD-' || v_random;
    
    -- Check if this order number already exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = v_order_number) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  NEW.order_number := v_order_number;
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-generate order number
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();