-- Add subject column to contact_templates table for email subject lines
ALTER TABLE public.contact_templates
ADD COLUMN subject text;