-- Reset PIN lockout for user
UPDATE profiles 
SET pin_attempts = 0, pin_locked_until = NULL 
WHERE user_id = '52cbbf5b-6ad0-449b-9f1d-d1b81b46c044';