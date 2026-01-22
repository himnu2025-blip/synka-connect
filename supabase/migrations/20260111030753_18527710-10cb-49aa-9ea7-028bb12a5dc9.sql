-- Add card_variant column to orders table
ALTER TABLE public.orders 
ADD COLUMN card_variant text;