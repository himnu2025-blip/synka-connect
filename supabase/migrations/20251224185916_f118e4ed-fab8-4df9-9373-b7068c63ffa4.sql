-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Add RLS policy for admins to update all profiles (for plan upgrades)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Create deleted_users table
CREATE TABLE public.deleted_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view deleted users
CREATE POLICY "Admins can view deleted users" 
ON public.deleted_users 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Only admins can insert deleted users (when soft-deleting)
CREATE POLICY "Admins can insert deleted users" 
ON public.deleted_users 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));