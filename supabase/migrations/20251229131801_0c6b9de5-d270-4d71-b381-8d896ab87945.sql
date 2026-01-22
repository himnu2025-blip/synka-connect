-- Add status column to chat_learning_signals for controlled learning workflow
-- Status values: new, reviewed, approved, rejected
ALTER TABLE public.chat_learning_signals 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new' 
CHECK (status IN ('new', 'reviewed', 'approved', 'rejected'));

-- Add suggested_answer column for admin to modify before approval
ALTER TABLE public.chat_learning_signals 
ADD COLUMN IF NOT EXISTS suggested_answer TEXT;

-- Add admin notes column
ALTER TABLE public.chat_learning_signals 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add approved_at timestamp
ALTER TABLE public.chat_learning_signals 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add approved_by to track which admin approved
ALTER TABLE public.chat_learning_signals 
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Add created_knowledge_id to link to the knowledge entry created from approval
ALTER TABLE public.chat_learning_signals 
ADD COLUMN IF NOT EXISTS created_knowledge_id UUID REFERENCES public.knowledge_base(id);

-- Create index for faster queries by status
CREATE INDEX IF NOT EXISTS idx_learning_signals_status ON public.chat_learning_signals(status);

-- Create index for frequency-based sorting
CREATE INDEX IF NOT EXISTS idx_learning_signals_frequency ON public.chat_learning_signals(frequency_count DESC);