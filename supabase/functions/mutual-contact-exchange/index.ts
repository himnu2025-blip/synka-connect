import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { viewerContact, cardOwnerId, cardId } = await req.json();

    console.log("Mutual exchange request:", { viewerContact, cardOwnerId, cardId });

    if (!viewerContact || !cardOwnerId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: viewerContact and cardOwnerId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if contact already exists for this owner (by email or phone)
    let existingContactQuery = supabase
      .from("contacts")
      .select("id")
      .eq("owner_id", cardOwnerId);

    if (viewerContact.email) {
      existingContactQuery = existingContactQuery.eq("email", viewerContact.email);
    } else if (viewerContact.phone) {
      existingContactQuery = existingContactQuery.eq("phone", viewerContact.phone);
    } else if (viewerContact.name) {
      existingContactQuery = existingContactQuery.eq("name", viewerContact.name);
    }

    const { data: existingContact } = await existingContactQuery.maybeSingle();

    if (existingContact) {
      console.log("Contact already exists for owner:", existingContact.id);
      return new Response(
        JSON.stringify({ success: true, message: "Contact already exists", contactId: existingContact.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new contact for card owner
    const { data: newContact, error: insertError } = await supabase
      .from("contacts")
      .insert({
        owner_id: cardOwnerId,
        name: viewerContact.name || "Unknown",
        email: viewerContact.email || null,
        phone: viewerContact.phone || null,
        whatsapp: viewerContact.whatsapp || null,
        company: viewerContact.company || null,
        designation: viewerContact.designation || null,
        linkedin: viewerContact.linkedin || null,
        website: viewerContact.website || null,
        source: "public_form",
        notes_history: viewerContact.notes 
          ? [{ content: viewerContact.notes, created_at: new Date().toISOString() }] 
          : [],
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert contact:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save contact", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Contact created successfully:", newContact.id);

    // Log analytics if cardId provided
    if (cardId) {
      const deviceHash = `exchange_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await supabase.from("contact_saves").insert({
        user_id: cardOwnerId,
        card_id: cardId,
        device_hash: deviceHash,
      });
    }

    return new Response(
      JSON.stringify({ success: true, contactId: newContact.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Mutual exchange error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
