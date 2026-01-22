-- Create card_templates table for storing layout designs
CREATE TABLE public.card_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL, -- NULL for system templates
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  asset_url TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;

-- System templates are viewable by everyone
CREATE POLICY "Anyone can view system templates"
ON public.card_templates
FOR SELECT
USING (is_system = true);

-- Users can view their own templates
CREATE POLICY "Users can view their own templates"
ON public.card_templates
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert their own templates"
ON public.card_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
ON public.card_templates
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
ON public.card_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_card_templates_updated_at
BEFORE UPDATE ON public.card_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert system templates
INSERT INTO public.card_templates (name, is_system, meta) VALUES
(
  'Classic Default',
  true,
  '{
    "id": "minimal",
    "profilePosition": "top-center",
    "backgroundType": "solid",
    "accentColor": "#6366f1",
    "gradient": "from-slate-50 to-white",
    "nameFontSize": "2xl",
    "designationFontSize": "sm",
    "contactIconStyle": "circular"
  }'::jsonb
),
(
  'Premium Dark Navy',
  true,
  '{
    "id": "navy-premium",
    "profilePosition": "bottom-right",
    "backgroundType": "solid",
    "accentColor": "#CBAF6B",
    "gradient": "from-slate-900 to-slate-800",
    "textColor": "#FFFFFF",
    "nameFontSize": "2xl",
    "designationFontSize": "xs",
    "contactIconStyle": "circular",
    "isDark": true
  }'::jsonb
),
(
  'Minimal Modern',
  true,
  '{
    "id": "minimal-modern",
    "profilePosition": "top-center",
    "backgroundType": "solid",
    "accentColor": "#111827",
    "gradient": "from-white to-gray-50",
    "textColor": "#111827",
    "nameFontSize": "3xl",
    "designationFontSize": "sm",
    "contactIconStyle": "rounded"
  }'::jsonb
),
(
  'Photo-Centric Hero',
  true,
  '{
    "id": "photo-hero",
    "profilePosition": "center-left",
    "backgroundType": "image",
    "accentColor": "#FFFFFF",
    "gradient": "from-black/60 to-black/40",
    "textColor": "#FFFFFF",
    "nameFontSize": "2xl",
    "designationFontSize": "sm",
    "contactIconStyle": "circular",
    "isDark": true,
    "hasOverlay": true
  }'::jsonb
),
(
  'Creative Studio',
  true,
  '{
    "id": "creative-studio",
    "profilePosition": "bottom-left",
    "backgroundType": "textured",
    "accentColor": "#F59E0B",
    "gradient": "from-zinc-900 to-zinc-800",
    "textColor": "#FFFFFF",
    "nameFontSize": "2xl",
    "designationFontSize": "xs",
    "contactIconStyle": "rounded",
    "isDark": true,
    "hasDecor": true
  }'::jsonb
),
(
  'Elegant Split',
  true,
  '{
    "id": "elegant-split",
    "profilePosition": "center-right",
    "backgroundType": "split",
    "accentColor": "#D4AF37",
    "gradient": "from-slate-900 to-slate-800",
    "textColor": "#FFFFFF",
    "nameFontSize": "xl",
    "designationFontSize": "sm",
    "contactIconStyle": "square",
    "isDark": true,
    "hasSplit": true
  }'::jsonb
);

-- Add layout_template_id column to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS layout_template_id UUID REFERENCES public.card_templates(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_card_templates_user_id ON public.card_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_card_templates_is_system ON public.card_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_cards_layout_template_id ON public.cards(layout_template_id);