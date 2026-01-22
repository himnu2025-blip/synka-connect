-- Drop the restrictive policies and create proper permissive ones
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contacts;
DROP POLICY IF EXISTS "Allow public contact submissions" ON public.contacts;

-- Create a permissive policy for public form submissions
CREATE POLICY "Public can submit via contact form"
ON public.contacts
FOR INSERT
TO anon, authenticated
WITH CHECK (source = 'public_form');