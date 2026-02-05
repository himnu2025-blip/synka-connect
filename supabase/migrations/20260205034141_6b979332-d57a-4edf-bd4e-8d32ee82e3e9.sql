-- Update Orange Monthly pricing with correct original price
UPDATE knowledge_base SET content = 'Orange Plan Monthly: ₹599 → ₹299/month (50% OFF - Limited Period Offer)' WHERE title = 'Pricing Orange Monthly';

-- Update Orange Annual pricing with correct original price
UPDATE knowledge_base SET content = 'Orange Plan Annual: ₹3999 → ₹1999/year (That''s just ₹166/month - 50% OFF Limited Period Offer!)' WHERE title = 'Pricing Orange Annual';

-- Update PVC Card pricing
UPDATE knowledge_base SET content = 'PVC NFC Card: ₹999 → ₹499 (50% OFF - Limited Period Offer)' WHERE title = 'Pricing PVC Card';

-- Update Metal Card pricing  
UPDATE knowledge_base SET content = 'Metal NFC Card: ₹2999 → ₹1499 (50% OFF - Limited Period Offer)' WHERE title = 'Pricing Metal Card';

-- Update the FAQ for pricing
UPDATE knowledge_base SET content = 'The Orange plan is ₹299/month right now (originally ₹599, 50% OFF). Or get the annual plan for just ₹1999/year (₹166/month) - save 50%! PVC NFC Card: ₹499 (was ₹999). Metal NFC Card: ₹1499 (was ₹2999).' WHERE title ILIKE '%FAQ%price%' OR title ILIKE '%FAQ%cost%';