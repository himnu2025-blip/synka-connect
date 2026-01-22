-- Add shared_card_id to contacts table for card-centric avatar syncing
ALTER TABLE contacts
ADD COLUMN shared_card_id uuid REFERENCES cards(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX idx_contacts_shared_card_id ON contacts(shared_card_id) WHERE shared_card_id IS NOT NULL;

-- Update the mutual_exchange_contact function to accept and save shared_card_id
CREATE OR REPLACE FUNCTION public.mutual_exchange_contact(
  p_owner_id uuid,
  p_viewer_id uuid,
  p_viewer_email text,
  p_viewer_name text,
  p_viewer_phone text DEFAULT NULL,
  p_viewer_whatsapp text DEFAULT NULL,
  p_viewer_company text DEFAULT NULL,
  p_viewer_designation text DEFAULT NULL,
  p_viewer_linkedin text DEFAULT NULL,
  p_viewer_website text DEFAULT NULL,
  p_viewer_photo_url text DEFAULT NULL,
  p_viewer_about text DEFAULT NULL,
  p_viewer_synka_user_id uuid DEFAULT NULL,
  p_viewer_shared_card_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id UUID;
  v_tag_id UUID;
  v_existing_contact RECORD;
  v_result JSON;
BEGIN
  -- Validate: viewer must be authenticated and match p_viewer_id
  IF auth.uid() IS NULL OR auth.uid() != p_viewer_id THEN
    RAISE EXCEPTION 'Unauthorized: viewer must be authenticated';
  END IF;

  -- Validate: owner and viewer must be different
  IF p_owner_id = p_viewer_id THEN
    RAISE EXCEPTION 'Cannot exchange with yourself';
  END IF;

  -- Check if viewer already exists in owner's CRM
  SELECT id, notes_history INTO v_existing_contact
  FROM contacts
  WHERE owner_id = p_owner_id AND email = p_viewer_email;

  IF v_existing_contact.id IS NOT NULL THEN
    -- UPDATE existing contact - update synka_user_id and shared_card_id for dynamic linking
    UPDATE contacts
    SET
      name = COALESCE(NULLIF(p_viewer_name, ''), name),
      phone = COALESCE(NULLIF(p_viewer_phone, ''), phone),
      whatsapp = COALESCE(NULLIF(p_viewer_whatsapp, ''), whatsapp),
      company = COALESCE(NULLIF(p_viewer_company, ''), company),
      designation = COALESCE(NULLIF(p_viewer_designation, ''), designation),
      linkedin = COALESCE(NULLIF(p_viewer_linkedin, ''), linkedin),
      website = COALESCE(NULLIF(p_viewer_website, ''), website),
      photo_url = COALESCE(NULLIF(p_viewer_photo_url, ''), photo_url),
      about = COALESCE(NULLIF(p_viewer_about, ''), about),
      synka_user_id = COALESCE(p_viewer_synka_user_id, synka_user_id),
      shared_card_id = COALESCE(p_viewer_shared_card_id, shared_card_id),
      source = 'synka_exchange',
      updated_at = now(),
      notes_history = COALESCE(v_existing_contact.notes_history, '[]'::jsonb) || 
        jsonb_build_array(jsonb_build_object(
          'text', 'Updated via Synka Exchange',
          'timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        ))
    WHERE id = v_existing_contact.id
    RETURNING id INTO v_contact_id;
  ELSE
    -- INSERT new contact with synka_user_id and shared_card_id for card-centric avatar
    INSERT INTO contacts (
      owner_id,
      email,
      name,
      phone,
      whatsapp,
      company,
      designation,
      linkedin,
      website,
      photo_url,
      about,
      synka_user_id,
      shared_card_id,
      source,
      notes_history
    ) VALUES (
      p_owner_id,
      p_viewer_email,
      p_viewer_name,
      p_viewer_phone,
      p_viewer_whatsapp,
      p_viewer_company,
      p_viewer_designation,
      p_viewer_linkedin,
      p_viewer_website,
      p_viewer_photo_url,
      p_viewer_about,
      p_viewer_synka_user_id,
      p_viewer_shared_card_id,
      'synka_exchange',
      jsonb_build_array(jsonb_build_object(
        'text', 'Connected via Synka Exchange',
        'timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ))
    )
    RETURNING id INTO v_contact_id;
  END IF;

  -- Create or get "Synka Exchange" tag
  SELECT id INTO v_tag_id
  FROM tags
  WHERE user_id = p_owner_id AND name = 'Synka Exchange';

  IF v_tag_id IS NULL THEN
    INSERT INTO tags (user_id, name, color)
    VALUES (p_owner_id, 'Synka Exchange', '#FF6B00')
    RETURNING id INTO v_tag_id;
  END IF;

  -- Link tag to contact (ignore if already linked)
  INSERT INTO contact_tags (contact_id, tag_id)
  VALUES (v_contact_id, v_tag_id)
  ON CONFLICT DO NOTHING;

  -- Build result
  v_result := json_build_object(
    'success', true,
    'contact_id', v_contact_id,
    'tag_id', v_tag_id
  );

  RETURN v_result;
END;
$function$;