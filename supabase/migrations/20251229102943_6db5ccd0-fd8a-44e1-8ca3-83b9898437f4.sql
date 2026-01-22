-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Bot configuration table (personality, tone, system prompts)
CREATE TABLE public.bot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write bot config
CREATE POLICY "Service role can manage bot config" 
ON public.bot_config 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Knowledge base with vector embeddings for FAQ/documents
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage knowledge base
CREATE POLICY "Service role can manage knowledge base" 
ON public.knowledge_base 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for vector similarity search
CREATE INDEX knowledge_base_embedding_idx ON public.knowledge_base 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Session memory for short-term conversation context
CREATE TABLE public.chat_session_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_info JSONB DEFAULT '{}',
  conversation_summary TEXT,
  detected_intents TEXT[],
  context_data JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  last_user_message TEXT,
  last_assistant_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_session_memory ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage session memory
CREATE POLICY "Service role can manage session memory" 
ON public.chat_session_memory 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Learning signals table (passive observation only)
CREATE TABLE public.chat_learning_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  query_text TEXT NOT NULL,
  query_embedding vector(768),
  matched_knowledge_id UUID REFERENCES public.knowledge_base(id),
  similarity_score FLOAT,
  response_text TEXT,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('low_confidence', 'no_match', 'repeated_query', 'user_feedback')),
  frequency_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_learning_signals ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage learning signals
CREATE POLICY "Service role can manage learning signals" 
ON public.chat_learning_signals 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for finding repeated queries
CREATE INDEX learning_signals_query_idx ON public.chat_learning_signals(query_text);

-- Create function to match knowledge base entries by vector similarity
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.is_active = true
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Insert initial bot configuration
INSERT INTO public.bot_config (config_key, config_value) VALUES 
('personality', '{
  "name": "Saira",
  "company": "Synka",
  "role": "AI assistant",
  "tone": "warm, natural, conversational - like chatting with a helpful friend",
  "style": [
    "Keep responses SHORT and to the point (2-4 sentences max for simple questions)",
    "Use casual language, not formal or robotic",
    "One emoji max per response, and only when natural",
    "Never start with Great question! or similar filler phrases",
    "Answer like youre texting, not writing an essay",
    "Never use bullet points or formatted lists - write naturally"
  ],
  "greeting_existing_user": "Hi {firstName} 👋, great to see you again!\nWhat can I help you with today?",
  "greeting_new_user": "Hi {firstName} 👋, welcome to Synka!\nWhat can I help you with today?",
  "goodbye_with_name": "Thanks for connecting, {firstName}! Happy to help. Have a great day ahead!",
  "goodbye_generic": "Thanks for connecting! Happy to help. Have a great day ahead!",
  "follow_up_question": "Is there anything else I can help you with?",
  "error_message": "Im having trouble connecting. Please try again!",
  "fallback_message": "Im not sure about that, but our team at support@synka.in can help!"
}'::jsonb),
('rules', '{
  "rules": [
    "Address the user by their FIRST NAME only when provided (never full name)",
    "Answer based on the knowledge base - dont make up features or prices",
    "If unsure, use the fallback message",
    "Keep it conversational",
    "For pricing, be specific but brief"
  ]
}'::jsonb);

-- Insert knowledge base entries from existing content
INSERT INTO public.knowledge_base (title, content, category) VALUES
('Core Concept', 'In Synka, your QR code, public link, and physical NFC card ALWAYS remain the same. Only your DEFAULT card is shared everywhere. You can change which card is default at any time, and instantly the same QR, link, and physical NFC card will start showing the new card. This is a first-of-its-kind feature in India.', 'general'),
('Dashboard', 'The Dashboard gives you a high-level overview of your activity. You can view total card views, contact saves, calls, emails, WhatsApp clicks, and upcoming or active events. Analytics here are cumulative and reflect real-time data.', 'features'),
('My Card Page', 'The My Card page is the heart of Synka. This page displays your currently selected card and allows you to edit, share, download, or post your digital card.', 'features'),
('Editing Card Details', 'Click on My Card in the header and tap the Edit icon. You can edit name, designation, company, bio, phone number, email, website, social links, and card design. Changes are auto-saved.', 'features'),
('Photo and Logo Upload', 'From Edit Card, you can upload your profile photo and company logo. Images are automatically optimized. You can toggle visibility of photo or logo on the card.', 'features'),
('Multiple Cards Orange Plan', 'Orange users can create multiple cards. Each card can have its own design and information. You can switch between cards using the card dropdown.', 'features'),
('Default Card Selection', 'Each card has a star icon. Tapping the star sets that card as default. Only one card can be default at a time. The default card is what opens via QR, NFC tap, public link, and physical card.', 'features'),
('Download Post Card', 'The Download / Post option generates a premium image of your card in real time. You can download it or post to WhatsApp Status or Instagram.', 'features'),
('CRM Page', 'The CRM page stores all your contacts and interactions. Contacts are captured automatically or added manually.', 'features'),
('Contact Capture', 'Contacts are captured when someone scans your QR, taps your NFC card, submits details on your public card page, you scan a physical business card, or you add a contact manually.', 'features'),
('Notes Interaction History', 'You can add notes for calls, emails, WhatsApp conversations, or meetings. Each note is time-stamped and linked to the contact.', 'features'),
('Tags Filters', 'You can add tags to contacts such as event name, lead status, or priority. Filter contacts by name, date added, or last interaction date.', 'features'),
('Templates AI Messaging', 'Synka provides one-click templates for WhatsApp, Email, and LinkedIn. Templates auto-fill contact name, company name, and your details.', 'features'),
('Events Auto Tagging', 'You can schedule events such as expos or meetings. During event timeframes, all interactions are auto-tagged with the event name.', 'features'),
('NFC Physical Cards', 'Synka NFC cards instantly open your default card when tapped. Android: Tap back of phone. iPhone: Tap front/top of phone.', 'nfc'),
('NFC Writer', 'To write your NFC card: Go to Settings → NFC Writer, turn NFC ON, tap Write, place card on phone, wait for confirmation.', 'nfc'),
('Settings Page', 'Settings allow you to manage account, plan, NFC, email signature, and orders.', 'features'),
('Upgrade to Orange', 'Upgrade from Settings to unlock multiple cards, premium templates, document uploads, advanced analytics, and AI features.', 'plans'),
('Order Physical Card', 'Order PVC or Metal NFC cards from Settings. Choose design or share your own idea for customization.', 'orders'),
('Email Signature', 'Synka offers HTML and image email signatures. HTML works on Gmail, Outlook, and Apple Mail (desktop).', 'features'),
('Pricing PVC Card', 'PVC NFC Card: ₹999 → ₹499 (Special Offer)', 'pricing'),
('Pricing Metal Card', 'Metal NFC Card: ₹2999 → ₹1499 (Special Offer)', 'pricing'),
('Pricing Orange Monthly', 'Orange Plan Monthly: ₹499 → ₹299/month', 'pricing'),
('Pricing Orange Annual', 'Orange Plan Annual: ₹3999 → ₹1999/year', 'pricing'),
('Teams Enterprise', 'For teams, Synka offers bulk pricing and custom CRM with team view.', 'enterprise'),
('Support Contact', 'Orders & Sales: orders@synka.in, Support: support@synka.in, Custom solutions: Saira@synka.in', 'support'),
('FAQ QR Change', 'Does my QR or NFC card change when I switch cards? No. Only the default card content changes. Your QR code, public link, and NFC card remain the same forever.', 'faq'),
('FAQ Contact Capture', 'Is contact capture real-time? Yes. Data is saved instantly when someone interacts with your card.', 'faq'),
('FAQ Delete Primary', 'Can I delete my primary card? No. Primary card cannot be deleted. You can edit it or create additional cards.', 'faq'),
('FAQ Upgrade', 'How do I upgrade to Orange plan? Go to Settings and tap on Upgrade.', 'faq'),
('FAQ NFC How', 'How do NFC cards work? Once programmed, tap the NFC card on any smartphone. It instantly opens your default digital card.', 'faq'),
('FAQ Multiple Cards', 'Can I have multiple cards? Yes, with the Orange plan. Free users have one card.', 'faq'),
('FAQ Default Card', 'How do I change my default card? Tap the star icon on any card to make it your default.', 'faq'),
('FAQ Digital Card', 'What is a digital business card? A digital business card is an electronic version of your traditional paper card. It can be shared via QR code, NFC tap, or link.', 'faq'),
('FAQ Share Card', 'How do I share my card? You can share via QR code, NFC tap, direct link, WhatsApp, email, or by downloading the card image.', 'faq'),
('FAQ Data Security', 'Is my data secure? Yes. Synka uses industry-standard encryption and secure cloud infrastructure.', 'faq'),
('FAQ Support Contact', 'How do I contact support? Email support@synka.in or chat with me (Saira) right here!', 'faq');

-- Add trigger for updated_at
CREATE TRIGGER update_bot_config_updated_at
BEFORE UPDATE ON public.bot_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_session_memory_updated_at
BEFORE UPDATE ON public.chat_session_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();