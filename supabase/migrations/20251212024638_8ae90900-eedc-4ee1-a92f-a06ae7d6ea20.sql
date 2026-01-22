-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_dashboard_analytics(uuid, timestamp with time zone, timestamp with time zone);

-- Create updated function with proper unique device counting
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
  p_user_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card_views INT;
  v_contact_saves INT;
  v_connections_added INT;
  v_attended_events INT;
  v_views_in_attended_events INT;
BEGIN
  -- Card Views: count unique devices using COALESCE(device_hash, md5(ip||user_agent))
  SELECT COUNT(DISTINCT COALESCE(device_hash, md5(COALESCE(ip_address::text, '') || COALESCE(user_agent, '')))) INTO v_card_views
  FROM scan_events
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Contact Saves: count unique devices
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

  -- Events: count attended events and sum of unique views in attended events
  WITH event_stats AS (
    SELECT 
      e.id as event_id,
      COUNT(DISTINCT COALESCE(s.device_hash, md5(COALESCE(s.ip_address::text, '') || COALESCE(s.user_agent, '')))) as unique_views
    FROM events e
    LEFT JOIN scan_events s ON s.user_id = p_user_id
      AND s.created_at >= e.start_time
      AND s.created_at <= COALESCE(e.end_time, e.start_time + INTERVAL '1 day')
    WHERE e.user_id = p_user_id
      AND (p_start_date IS NULL OR e.start_time >= p_start_date)
      AND (p_end_date IS NULL OR e.start_time <= p_end_date)
    GROUP BY e.id
  )
  SELECT 
    COALESCE(COUNT(CASE WHEN unique_views > 0 THEN 1 END), 0)::INT,
    COALESCE(SUM(unique_views), 0)::INT
  INTO v_attended_events, v_views_in_attended_events
  FROM event_stats;

  RETURN json_build_object(
    'card_views', COALESCE(v_card_views, 0),
    'contact_saves', COALESCE(v_contact_saves, 0),
    'connections_added', COALESCE(v_connections_added, 0),
    'attended_events', COALESCE(v_attended_events, 0),
    'views_in_attended_events', COALESCE(v_views_in_attended_events, 0)
  );
END;
$function$;

-- Create function to get attended events list for popup
CREATE OR REPLACE FUNCTION public.get_attended_events_list(
  p_user_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT json_agg(event_data ORDER BY start_time DESC)
    FROM (
      SELECT 
        e.id,
        e.title,
        e.start_time,
        e.end_time,
        COUNT(DISTINCT COALESCE(s.device_hash, md5(COALESCE(s.ip_address::text, '') || COALESCE(s.user_agent, '')))) as unique_views
      FROM events e
      LEFT JOIN scan_events s ON s.user_id = p_user_id
        AND s.created_at >= e.start_time
        AND s.created_at <= COALESCE(e.end_time, e.start_time + INTERVAL '1 day')
      WHERE e.user_id = p_user_id
        AND (p_start_date IS NULL OR e.start_time >= p_start_date)
        AND (p_end_date IS NULL OR e.start_time <= p_end_date)
      GROUP BY e.id, e.title, e.start_time, e.end_time
      HAVING COUNT(DISTINCT COALESCE(s.device_hash, md5(COALESCE(s.ip_address::text, '') || COALESCE(s.user_agent, '')))) > 0
    ) event_data
  );
END;
$function$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_events_user_created ON scan_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contact_saves_user_created ON contact_saves(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(user_id, start_time, end_time);