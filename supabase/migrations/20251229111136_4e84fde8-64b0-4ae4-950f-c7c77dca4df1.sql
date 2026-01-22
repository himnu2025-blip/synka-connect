-- Add system messages to bot_config
INSERT INTO bot_config (config_key, config_value) VALUES
  ('messages', '{
    "welcome": "Hi, I''m Saira — Synka''s AI assistant.\nHow can I help you today?",
    "form_intro": "Before we begin, please share a few details so I can assist you better.",
    "warning": "Just checking — are we still connected?",
    "goodbye_with_name": "Thanks for connecting, {{name}}! Happy to help. Have a great day ahead!",
    "goodbye": "Thanks for connecting! Happy to help. Have a great day ahead!",
    "follow_up": "Is there anything else I can help you with?",
    "error": "I''m having trouble connecting. Please try again!",
    "greeting_existing": "Hi {{name}} 👋, great to see you again!\nWhat can I help you with today?",
    "greeting_new": "Hi {{name}} 👋, welcome to Synka!\nWhat can I help you with today?"
  }'::jsonb)
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;