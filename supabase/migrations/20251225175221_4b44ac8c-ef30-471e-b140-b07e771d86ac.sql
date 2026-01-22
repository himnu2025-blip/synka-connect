-- Add unique constraint on user_id + name for cards table
-- This ensures no user can have two cards with the same name
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_user_name_unique 
ON public.cards (user_id, lower(name));