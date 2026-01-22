-- Drop the existing product_type check constraint and recreate with orange_upgrade
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_product_type_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_product_type_check 
  CHECK (product_type IN ('pvc', 'metal', 'orange_upgrade'));