-- Fix: Activate the successfully resumed subscription (mandate was created)
UPDATE subscriptions 
SET status = 'active',
    payment_status = 'paid'
WHERE id = '7b5f6670-fb39-4071-8fc3-c4d03d1eb660';

-- Clean up other orphaned pending resumed subscriptions - mark as cancelled
UPDATE subscriptions 
SET status = 'cancelled'
WHERE id IN ('2b2ce960-f272-4d71-9182-6e4f395e1923', '7317e4b9-e553-4a0b-a199-36b7f1a3bd1e', '045d300d-1ae2-4019-ba44-43d7378f1302');