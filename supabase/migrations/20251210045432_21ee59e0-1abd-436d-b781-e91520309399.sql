-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  designation TEXT DEFAULT '',
  company TEXT DEFAULT '',
  website TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  about TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  card_design TEXT DEFAULT 'minimal',
  public_slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Public access for public card view (read-only for specific fields via slug)
CREATE POLICY "Anyone can view public card by slug"
  ON public.profiles FOR SELECT
  USING (true);

-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'TAG' CHECK (type IN ('TAG', 'EVENT')),
  event_date DATE DEFAULT NULL,
  event_time TIME DEFAULT NULL,
  event_end_date DATE DEFAULT NULL,
  event_end_time TIME DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  designation TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for contacts
CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create contacts for themselves"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Allow public card form submissions to create contacts for card owners
CREATE POLICY "Public can create contacts for card owners"
  ON public.contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = contacts.user_id
    )
  );

-- Create contact_tags junction table
CREATE TABLE public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

-- Enable RLS on contact_tags
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_tags
CREATE POLICY "Users can view their own contact tags"
  ON public.contact_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create contact tags"
  ON public.contact_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contact tags"
  ON public.contact_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for notes
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- Allow public to create notes when submitting contact form
CREATE POLICY "Public can create notes for contacts"
  ON public.notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      JOIN public.profiles p ON p.id = c.user_id
      WHERE c.id = notes.contact_id
    )
  );

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_unique_slug()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric slug
    new_slug := lower(substring(md5(random()::text) from 1 for 8));
    
    -- Check if slug already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_slug = new_slug) INTO slug_exists;
    
    IF NOT slug_exists THEN
      RETURN new_slug;
    END IF;
  END LOOP;
END;
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, public_slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    public.generate_unique_slug()
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-tag contacts during events
CREATE OR REPLACE FUNCTION public.auto_tag_contact_for_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  event_tag RECORD;
BEGIN
  -- Find active events for this user
  FOR event_tag IN
    SELECT id FROM public.tags
    WHERE user_id = NEW.user_id
    AND type = 'EVENT'
    AND event_date IS NOT NULL
    AND (
      -- Same day as event
      (event_date = CURRENT_DATE)
      OR
      -- Within event date range
      (event_end_date IS NOT NULL AND CURRENT_DATE BETWEEN event_date AND event_end_date)
    )
  LOOP
    -- Auto-tag the contact with the event
    INSERT INTO public.contact_tags (contact_id, tag_id)
    VALUES (NEW.id, event_tag.id)
    ON CONFLICT (contact_id, tag_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for auto-tagging contacts
CREATE TRIGGER auto_tag_contact_trigger
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.auto_tag_contact_for_events();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tags for new users (via a function called after profile creation)
CREATE OR REPLACE FUNCTION public.create_default_tags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert default tags
  INSERT INTO public.tags (user_id, name, type) VALUES
    (NEW.id, 'VIP Client', 'TAG'),
    (NEW.id, 'Follow Up', 'TAG'),
    (NEW.id, 'Partner', 'TAG'),
    (NEW.id, 'Lead', 'TAG');
  RETURN NEW;
END;
$$;

-- Trigger for default tags
CREATE TRIGGER create_default_tags_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_tags();