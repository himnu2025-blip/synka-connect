-- RESEED TEMPLATES FOR ALL USERS
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qlrnewbkolxjdtfffuml/sql/new

-- Step 1: Delete ALL existing templates
DELETE FROM contact_templates;

-- Step 2: Insert 4 standard templates for each user who has a profile
INSERT INTO contact_templates (user_id, name, channel, subject, body, is_selected_for_email, is_selected_for_whatsapp)
SELECT 
  p.user_id,
  'Introduction',
  'whatsapp',
  NULL,
  'Hi {{name}}, It was nice connecting with you.
Sharing my details here: My Digital Card {{myCardLink}}
Happy to stay in touch.

{{myName}}
{{myCompany}}',
  false,
  false
FROM profiles p;

INSERT INTO contact_templates (user_id, name, channel, subject, body, is_selected_for_email, is_selected_for_whatsapp)
SELECT 
  p.user_id,
  'Follow-up',
  'whatsapp',
  NULL,
  'Hello {{name}}, I hope you are keeping well.
Would be glad to connect at a time convenient for you.

{{myName}}
My Digital Card {{myCardLink}}',
  false,
  false
FROM profiles p;

INSERT INTO contact_templates (user_id, name, channel, subject, body, is_selected_for_email, is_selected_for_whatsapp)
SELECT 
  p.user_id,
  'Introduction',
  'email',
  'Connecting after our introduction',
  'Hello {{name}},

It was a pleasure connecting with you.

Please find my contact details below.
My Digital Card {{myCardLink}}

I look forward to continuing the conversation.

Warm regards,
{{myName}}
{{myCompany}}',
  false,
  false
FROM profiles p;

INSERT INTO contact_templates (user_id, name, channel, subject, body, is_selected_for_email, is_selected_for_whatsapp)
SELECT 
  p.user_id,
  'Follow-up',
  'email',
  'Connecting further',
  'Hello {{name}},

I hope you are keeping well.
I thought this might be a good moment to reconnect.
Would be glad to connect at a time convenient for you.

My Digital Card {{myCardLink}}

Kind regards,
{{myName}}
{{myCompany}}',
  false,
  false
FROM profiles p;
