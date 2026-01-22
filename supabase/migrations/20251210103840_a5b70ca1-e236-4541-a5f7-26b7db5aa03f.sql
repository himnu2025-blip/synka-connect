-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  slug TEXT UNIQUE,
  photo_url TEXT,
  logo_url TEXT,
  about TEXT,
  layout TEXT DEFAULT 'classic',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_tags junction table
CREATE TABLE public.contact_tags (
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- Create events table for scheduler
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public profiles viewable by slug" ON public.profiles FOR SELECT USING (slug IS NOT NULL);

-- Contacts policies
CREATE POLICY "Users can view their own contacts" ON public.contacts FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own contacts" ON public.contacts FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Anyone can submit contact form" ON public.contacts FOR INSERT WITH CHECK (true);

-- Tags policies
CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Contact tags policies
CREATE POLICY "Users can manage their contact tags" ON public.contact_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_tags.contact_id AND contacts.owner_id = auth.uid())
);

-- Events policies
CREATE POLICY "Users can view their own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true);

-- Storage policies
CREATE POLICY "Anyone can view profile images" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "Users can upload their own images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own images" ON storage.objects FOR UPDATE USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);