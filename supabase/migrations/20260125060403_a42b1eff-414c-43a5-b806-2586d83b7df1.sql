CREATE OR REPLACE FUNCTION public.mutual_exchange_contact(p_owner_id uuid, p_viewer_id uuid, p_viewer_email text, p_viewer_name text, p_viewer_phone text DEFAULT NULL::text, p_viewer_whatsapp text DEFAULT NULL::text, p_viewer_company text DEFAULT NULL::text, p_viewer_designation text DEFAULT NULL::text, p_viewer_linkedin text DEFAULT NULL::text, p_viewer_website text DEFAULT NULL::text, p_viewer_photo_url text DEFAULT NULL::text, p_viewer_about text DEFAULT NULL::text, p_viewer_synka_user_id uuid DEFAULT NULL::uuid, p_viewer_shared_card_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id UUID;
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
  SELECT id INTO v_existing_contact
  FROM contacts
  WHERE owner_id = p_owner_id AND email = p_viewer_email;

  IF v_existing_contact.id IS NOT NULL THEN
    -- UPDATE existing contact with card-centric linking
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
      updated_at = now()
    WHERE id = v_existing_contact.id
    RETURNING id INTO v_contact_id;
  ELSE
    -- INSERT new contact with card-centric avatar linking (no notes)
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
      source
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
      'synka_exchange'
    )
    RETURNING id INTO v_contact_id;
  END IF;

  -- Return result (no tagging)
  v_result := json_build_object(
    'success', true,
    'contact_id', v_contact_id
  );

  RETURN v_result;
END;
$function$;