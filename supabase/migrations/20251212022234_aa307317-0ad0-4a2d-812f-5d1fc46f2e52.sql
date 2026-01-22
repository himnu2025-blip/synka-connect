-- Create scan_events table for tracking QR/NFC views
CREATE TABLE public.scan_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'qr' CHECK (source IN ('qr', 'nfc')),
  device_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_saves table for tracking "Save Contact" button clicks
CREATE TABLE public.contact_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_saves ENABLE ROW LEVEL SECURITY;

-- RLS policies for scan_events (public insert, owner can view)
CREATE POLICY "Anyone can log scan events"
ON public.scan_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own scan events"
ON public.scan_events
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for contact_saves (public insert, owner can view)
CREATE POLICY "Anyone can log contact saves"
ON public.contact_saves
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own contact saves"
ON public.contact_saves
FOR SELECT
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_scan_events_user_created ON public.scan_events(user_id, created_at);
CREATE INDEX idx_scan_events_device_hash ON public.scan_events(device_hash);
CREATE INDEX idx_contact_saves_user_created ON public.contact_saves(user_id, created_at);

-- RPC function to get analytics for dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_views INT;
  v_contact_saves INT;
  v_connections_added INT;
  v_events_attended INT;
  v_events_total INT;
  v_event_activations INT;
BEGIN
  -- Card Views: count unique device_hash per user within date range
  SELECT COUNT(DISTINCT device_hash) INTO v_card_views
  FROM scan_events
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Contact Saves: count unique device_hash for save button clicks
  SELECT COUNT(DISTINCT device_hash) INTO v_contact_saves
  FROM contact_saves
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Connections Added: count distinct contacts created by this user in date range
  SELECT COUNT(DISTINCT id) INTO v_connections_added
  FROM contacts
  WHERE owner_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Events: count attended vs total scheduled events
  -- Total events in date range
  SELECT COUNT(*) INTO v_events_total
  FROM events
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR start_time >= p_start_date)
    AND (p_end_date IS NULL OR start_time <= p_end_date);

  -- Events attended (at least one scan during event window)
  SELECT COUNT(DISTINCT e.id) INTO v_events_attended
  FROM events e
  WHERE e.user_id = p_user_id
    AND (p_start_date IS NULL OR e.start_time >= p_start_date)
    AND (p_end_date IS NULL OR e.start_time <= p_end_date)
    AND EXISTS (
      SELECT 1 FROM scan_events s
      WHERE s.user_id = p_user_id
        AND s.created_at >= e.start_time
        AND s.created_at <= COALESCE(e.end_time, e.start_time + INTERVAL '1 day')
    );

  -- Event Activations: total scans during engaged events
  SELECT COALESCE(SUM(scan_count), 0)::INT INTO v_event_activations
  FROM (
    SELECT COUNT(*) as scan_count
    FROM events e
    JOIN scan_events s ON s.user_id = e.user_id
      AND s.created_at >= e.start_time
      AND s.created_at <= COALESCE(e.end_time, e.start_time + INTERVAL '1 day')
    WHERE e.user_id = p_user_id
      AND (p_start_date IS NULL OR e.start_time >= p_start_date)
      AND (p_end_date IS NULL OR e.start_time <= p_end_date)
    GROUP BY e.id
  ) sub;

  RETURN json_build_object(
    'card_views', COALESCE(v_card_views, 0),
    'contact_saves', COALESCE(v_contact_saves, 0),
    'connections_added', COALESCE(v_connections_added, 0),
    'events_attended', COALESCE(v_events_attended, 0),
    'events_total', COALESCE(v_events_total, 0),
    'event_activations', COALESCE(v_event_activations, 0)
  );
END;
$$;