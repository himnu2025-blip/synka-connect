-- Add event_id column to scan_events table
ALTER TABLE public.scan_events 
ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- Add event_id column to contact_saves table
ALTER TABLE public.contact_saves 
ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- Add event_id column to contacts table (for connections)
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_scan_events_event_id ON public.scan_events(event_id);
CREATE INDEX IF NOT EXISTS idx_contact_saves_event_id ON public.contact_saves(event_id);
CREATE INDEX IF NOT EXISTS idx_contacts_event_id ON public.contacts(event_id);

-- Create function to detect active event for a user at current time
CREATE OR REPLACE FUNCTION public.get_active_event_id(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  -- Find an active event where now() is between start_time and end_time
  -- All comparisons done in UTC
  SELECT id INTO v_event_id
  FROM events
  WHERE user_id = p_user_id
    AND now() AT TIME ZONE 'UTC' >= start_time AT TIME ZONE 'UTC'
    AND now() AT TIME ZONE 'UTC' <= COALESCE(end_time, start_time + INTERVAL '1 day') AT TIME ZONE 'UTC'
  ORDER BY start_time DESC
  LIMIT 1;
  
  RETURN v_event_id;
END;
$$;

-- Create trigger function for scan_events
CREATE OR REPLACE FUNCTION public.set_scan_event_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only set event_id if not already provided
  IF NEW.event_id IS NULL THEN
    NEW.event_id := get_active_event_id(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function for contact_saves
CREATE OR REPLACE FUNCTION public.set_contact_save_event_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only set event_id if not already provided
  IF NEW.event_id IS NULL THEN
    NEW.event_id := get_active_event_id(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function for contacts (connections)
CREATE OR REPLACE FUNCTION public.set_contact_event_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only set event_id if not already provided
  IF NEW.event_id IS NULL THEN
    NEW.event_id := get_active_event_id(NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS tr_set_scan_event_id ON public.scan_events;
CREATE TRIGGER tr_set_scan_event_id
  BEFORE INSERT ON public.scan_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_scan_event_id();

DROP TRIGGER IF EXISTS tr_set_contact_save_event_id ON public.contact_saves;
CREATE TRIGGER tr_set_contact_save_event_id
  BEFORE INSERT ON public.contact_saves
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_save_event_id();

DROP TRIGGER IF EXISTS tr_set_contact_event_id ON public.contacts;
CREATE TRIGGER tr_set_contact_event_id
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_event_id();

-- Update get_dashboard_analytics to use event_id linkage
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(p_user_id uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
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
  -- Authorization check: ensure user can only access their own analytics
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other users analytics';
  END IF;

  -- Card Views: count unique devices (global - includes all, with or without events)
  SELECT COUNT(DISTINCT COALESCE(device_hash, md5(COALESCE(ip_address::text, '') || COALESCE(user_agent, '')))) INTO v_card_views
  FROM scan_events
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Contact Saves: count unique devices (global)
  SELECT COUNT(DISTINCT device_hash) INTO v_contact_saves
  FROM contact_saves
  WHERE user_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Connections Added: count distinct contacts created by this user in date range (global)
  SELECT COUNT(DISTINCT id) INTO v_connections_added
  FROM contacts
  WHERE owner_id = p_user_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Events: count attended events (events with at least 1 linked analytics row)
  -- and total unique views across attended events
  WITH event_analytics AS (
    SELECT DISTINCT event_id
    FROM (
      SELECT event_id FROM scan_events 
      WHERE user_id = p_user_id AND event_id IS NOT NULL
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
      UNION
      SELECT event_id FROM contact_saves 
      WHERE user_id = p_user_id AND event_id IS NOT NULL
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
      UNION
      SELECT event_id FROM contacts 
      WHERE owner_id = p_user_id AND event_id IS NOT NULL
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    ) all_events
  ),
  event_views AS (
    SELECT 
      COUNT(DISTINCT COALESCE(device_hash, md5(COALESCE(ip_address::text, '') || COALESCE(user_agent, '')))) as unique_views
    FROM scan_events
    WHERE user_id = p_user_id 
      AND event_id IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  )
  SELECT 
    (SELECT COUNT(*) FROM event_analytics)::INT,
    (SELECT COALESCE(unique_views, 0) FROM event_views)::INT
  INTO v_attended_events, v_views_in_attended_events;

  RETURN json_build_object(
    'card_views', COALESCE(v_card_views, 0),
    'contact_saves', COALESCE(v_contact_saves, 0),
    'connections_added', COALESCE(v_connections_added, 0),
    'attended_events', COALESCE(v_attended_events, 0),
    'views_in_attended_events', COALESCE(v_views_in_attended_events, 0)
  );
END;
$function$;

-- Update get_attended_events_list to use event_id linkage
CREATE OR REPLACE FUNCTION public.get_attended_events_list(p_user_id uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: ensure user can only access their own events
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access other users events';
  END IF;

  RETURN (
    SELECT json_agg(event_data ORDER BY start_time DESC)
    FROM (
      SELECT 
        e.id,
        e.title,
        e.start_time,
        e.end_time,
        COALESCE(views.unique_views, 0) as unique_views,
        COALESCE(saves.save_count, 0) as contact_saves,
        COALESCE(conns.conn_count, 0) as connections_added
      FROM events e
      LEFT JOIN (
        SELECT 
          event_id,
          COUNT(DISTINCT COALESCE(device_hash, md5(COALESCE(ip_address::text, '') || COALESCE(user_agent, '')))) as unique_views
        FROM scan_events
        WHERE user_id = p_user_id
          AND event_id IS NOT NULL
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY event_id
      ) views ON views.event_id = e.id
      LEFT JOIN (
        SELECT 
          event_id,
          COUNT(DISTINCT device_hash) as save_count
        FROM contact_saves
        WHERE user_id = p_user_id
          AND event_id IS NOT NULL
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY event_id
      ) saves ON saves.event_id = e.id
      LEFT JOIN (
        SELECT 
          event_id,
          COUNT(DISTINCT id) as conn_count
        FROM contacts
        WHERE owner_id = p_user_id
          AND event_id IS NOT NULL
          AND (p_start_date IS NULL OR created_at >= p_start_date)
          AND (p_end_date IS NULL OR created_at <= p_end_date)
        GROUP BY event_id
      ) conns ON conns.event_id = e.id
      WHERE e.user_id = p_user_id
        AND (p_start_date IS NULL OR e.start_time >= p_start_date)
        AND (p_end_date IS NULL OR e.start_time <= p_end_date)
        AND (COALESCE(views.unique_views, 0) > 0 OR COALESCE(saves.save_count, 0) > 0 OR COALESCE(conns.conn_count, 0) > 0)
    ) event_data
  );
END;
$function$;

-- Update the old get_attended_events function to use event_id as well
CREATE OR REPLACE FUNCTION public.get_attended_events(start_ts timestamp with time zone, end_ts timestamp with time zone)
 RETURNS TABLE(id uuid, title text, start_time timestamp with time zone, end_time timestamp with time zone, views bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id,
    e.title,
    e.start_time,
    e.end_time,
    COUNT(DISTINCT se.id) AS views
  FROM events e
  JOIN scan_events se ON se.event_id = e.id
  WHERE (start_ts IS NULL OR e.start_time >= start_ts)
    AND (end_ts IS NULL OR e.start_time <= end_ts)
  GROUP BY e.id, e.title, e.start_time, e.end_time
  ORDER BY views DESC;
$function$;