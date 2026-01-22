-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('free', 'orange', 'admin');

-- 2. Create user_roles table (separate from profiles as per security best practices)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- 6. RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_admin(auth.uid()));

-- 7. Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('pvc', 'metal')),
    quantity INTEGER NOT NULL DEFAULT 1,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'delivered')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies for orders
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- 10. Create plan_history table
CREATE TABLE public.plan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_plan TEXT NOT NULL,
    new_plan TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    changed_by UUID
);

-- 11. Enable RLS on plan_history
ALTER TABLE public.plan_history ENABLE ROW LEVEL SECURITY;

-- 12. RLS policies for plan_history
CREATE POLICY "Users can view their own plan history"
ON public.plan_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all plan history"
ON public.plan_history
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert plan history"
ON public.plan_history
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- 13. Add plan column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'Free';

-- 14. Create trigger to auto-create user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 15. Create function to upgrade user plan (admin only)
CREATE OR REPLACE FUNCTION public.upgrade_user_plan(
  _user_id UUID,
  _new_plan TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_plan TEXT;
  _new_role app_role;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can upgrade plans';
  END IF;

  -- Get current plan
  SELECT plan INTO _old_plan FROM public.profiles WHERE user_id = _user_id;
  
  -- Determine new role based on plan
  IF _new_plan = 'Orange' THEN
    _new_role := 'orange';
  ELSE
    _new_role := 'free';
  END IF;

  -- Update profile plan
  UPDATE public.profiles SET plan = _new_plan, updated_at = now() WHERE user_id = _user_id;
  
  -- Update or insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Remove old role if upgrading
  IF _new_plan = 'Orange' THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'free';
  END IF;
  
  -- Log plan change
  INSERT INTO public.plan_history (user_id, old_plan, new_plan, changed_by)
  VALUES (_user_id, COALESCE(_old_plan, 'Free'), _new_plan, auth.uid());
  
  RETURN TRUE;
END;
$$;

-- 16. Insert admin role for the admin user (will be done after user exists)
-- This should be run manually after the admin user signs up:
-- INSERT INTO public.user_roles (user_id, role) 
-- SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'himnu2025@gmail.com'
-- ON CONFLICT DO NOTHING;

-- 17. Create trigger for orders updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();