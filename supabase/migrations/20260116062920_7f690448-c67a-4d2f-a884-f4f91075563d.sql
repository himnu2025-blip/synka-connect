-- Create payments table for tracking all payment attempts
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  razorpay_payment_id text,
  razorpay_order_id text,
  razorpay_signature text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  method text,
  error_code text,
  error_description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add Razorpay fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS razorpay_order_id text,
ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
ADD COLUMN IF NOT EXISTS razorpay_signature text,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '{}'::jsonb;

-- Add Razorpay fields to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS razorpay_subscription_id text,
ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
ADD COLUMN IF NOT EXISTS razorpay_signature text,
ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS billing_cycle text,
ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '{}'::jsonb;

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments RLS policies
CREATE POLICY "Users can view their own payments" ON public.payments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON public.payments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.payments
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all payments" ON public.payments
FOR UPDATE USING (is_admin(auth.uid()));

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON public.payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id ON public.subscriptions(razorpay_subscription_id);

-- Create trigger for updated_at on payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to upgrade user plan with expiry
CREATE OR REPLACE FUNCTION public.activate_user_subscription(
  p_user_id uuid,
  p_plan_type text,
  p_end_date timestamp with time zone
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_plan TEXT;
BEGIN
  -- Get current plan
  SELECT plan INTO _old_plan FROM public.profiles WHERE user_id = p_user_id;
  
  -- Update profile to Orange plan
  UPDATE public.profiles 
  SET plan = 'Orange', updated_at = now() 
  WHERE user_id = p_user_id;
  
  -- Update or insert role to orange
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'orange')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Remove free role if exists
  DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'free';
  
  -- Log plan change
  INSERT INTO public.plan_history (user_id, old_plan, new_plan, changed_by)
  VALUES (p_user_id, COALESCE(_old_plan, 'Free'), 'Orange', p_user_id);
  
  RETURN TRUE;
END;
$$;