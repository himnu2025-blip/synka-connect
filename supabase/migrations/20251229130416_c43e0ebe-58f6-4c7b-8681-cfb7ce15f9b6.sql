-- Fix the trigger to NOT update updated_at (which would cause infinite loop with UPDATE trigger)
-- The embedding generation function handles the updated_at
CREATE OR REPLACE FUNCTION public.trigger_embedding_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only clear embedding if title or content actually changed
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)) THEN
    NEW.embedding := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;