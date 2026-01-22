-- Create a function to match learning signals by vector similarity
-- This enables semantic grouping of similar questions with different wording
CREATE OR REPLACE FUNCTION public.match_learning_signal(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  query_text text,
  frequency_count integer,
  signal_type text,
  status text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cls.id,
    cls.query_text,
    cls.frequency_count,
    cls.signal_type,
    cls.status,
    1 - (cls.query_embedding <=> query_embedding) as similarity
  FROM chat_learning_signals cls
  WHERE 
    cls.query_embedding IS NOT NULL
    AND cls.status IN ('new', 'reviewed')  -- Only group with unprocessed signals
    AND 1 - (cls.query_embedding <=> query_embedding) > match_threshold
  ORDER BY cls.query_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add index for faster vector similarity search on learning signals
CREATE INDEX IF NOT EXISTS idx_learning_signals_embedding 
ON public.chat_learning_signals 
USING ivfflat (query_embedding vector_cosine_ops)
WHERE query_embedding IS NOT NULL;