-- Mark the old cancelled subscription as cancelled so it doesn't trigger resume check
UPDATE subscriptions 
SET status = 'cancelled'
WHERE id = 'bd754fa8-0070-4e17-9ead-fc2e36bb1c07';