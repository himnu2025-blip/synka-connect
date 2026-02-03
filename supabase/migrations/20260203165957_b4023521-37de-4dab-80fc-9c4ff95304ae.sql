-- Backfill: mark the resumed subscription as fully active
UPDATE subscriptions
SET
  auto_renew = true,
  cancelled_at = NULL,
  cancellation_reason = NULL,
  updated_at = now()
WHERE id = '7b5f6670-fb39-4071-8fc3-c4d03d1eb660';