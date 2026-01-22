-- Enable RLS on contact_notes table and add proper policies

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- Users can view notes on their own contacts
CREATE POLICY "Users can view notes on their contacts" 
ON public.contact_notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = contact_notes.contact_id 
    AND contacts.owner_id = auth.uid()
  )
);

-- Users can insert notes on their own contacts
CREATE POLICY "Users can insert notes on their contacts" 
ON public.contact_notes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = contact_notes.contact_id 
    AND contacts.owner_id = auth.uid()
  )
);

-- Users can update notes on their own contacts
CREATE POLICY "Users can update notes on their contacts" 
ON public.contact_notes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = contact_notes.contact_id 
    AND contacts.owner_id = auth.uid()
  )
);

-- Users can delete notes on their own contacts
CREATE POLICY "Users can delete notes on their contacts" 
ON public.contact_notes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = contact_notes.contact_id 
    AND contacts.owner_id = auth.uid()
  )
);

-- Fix get_attended_events function to have search_path set
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
    COUNT(se.*) AS views
  FROM events e
  JOIN scan_events se
    ON se.created_at BETWEEN e.start_time AND e.end_time
  WHERE (start_ts IS NULL OR e.start_time >= start_ts)
    AND (end_ts IS NULL OR e.start_time <= end_ts)
  GROUP BY e.id, e.title, e.start_time, e.end_time
  ORDER BY views DESC;
$function$;