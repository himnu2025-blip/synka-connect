-- Add RLS policy to allow anonymous/public users to insert contacts
-- This enables the public form on the digital card to work
CREATE POLICY "Allow public contact submissions" 
ON public.contacts 
FOR INSERT 
WITH CHECK (source = 'public_form');