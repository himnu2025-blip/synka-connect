import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashSync, compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MINUTES = 15;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, pin, user_id } = await req.json();
    console.log(`PIN Auth action: ${action} for email: ${email || 'N/A'}`);

    // Action: SET_PIN - Hash and store PIN for a user
    if (action === "SET_PIN") {
      if (!user_id || !pin) {
        return new Response(
          JSON.stringify({ error: "user_id and pin are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate PIN format (4 digits)
      if (!/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: "PIN must be exactly 4 digits" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Hash the PIN using synchronous method (async uses Workers which aren't available)
      const pinHash = hashSync(pin);
      console.log(`Setting PIN hash for user: ${user_id}`);

      // Update the profile with the hashed PIN
      const { error } = await supabase
        .from("profiles")
        .update({ 
          pin_hash: pinHash, 
          pin_attempts: 0, 
          pin_locked_until: null 
        })
        .eq("user_id", user_id);

      if (error) {
        console.error("Error setting PIN:", error);
        return new Response(
          JSON.stringify({ error: "Failed to set PIN" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`PIN set successfully for user: ${user_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "PIN set successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: VERIFY_PIN - Verify PIN for login
    if (action === "VERIFY_PIN") {
      if (!email || !pin) {
        return new Response(
          JSON.stringify({ error: "email and pin are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, pin_hash, pin_attempts, pin_locked_until")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (profileError || !profile) {
        console.log(`Profile not found for email: ${email}`);
        return new Response(
          JSON.stringify({ success: false, error: "User not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date();
      let currentAttempts = profile.pin_attempts || 0;

      // Check if account is locked
      if (profile.pin_locked_until) {
        const lockedUntil = new Date(profile.pin_locked_until);

        if (lockedUntil > now) {
          const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
          console.log(
            `Account locked for user: ${profile.user_id}, minutes left: ${minutesLeft}`
          );
          return new Response(
            JSON.stringify({
              success: false,
              error: `Account locked. Try again in ${minutesLeft} minute(s).`,
              locked: true,
              minutes_left: minutesLeft,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Lock expired: reset attempts so users don't get negative attempts_left
        console.log(`Lock expired. Resetting attempts for user: ${profile.user_id}`);
        currentAttempts = 0;
        await supabase
          .from("profiles")
          .update({ pin_attempts: 0, pin_locked_until: null })
          .eq("user_id", profile.user_id);
      }

      // Check if PIN is set
      if (!profile.pin_hash) {
        console.log(`No PIN set for user: ${profile.user_id}`);
        return new Response(
          JSON.stringify({ success: false, error: "PIN not set", needs_pin_setup: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the PIN using synchronous method
      const isValid = compareSync(pin, profile.pin_hash);

      if (!isValid) {
        const newAttempts = currentAttempts + 1;
        console.log(`Invalid PIN attempt ${newAttempts}/${MAX_PIN_ATTEMPTS} for user: ${profile.user_id}`);

        // Update attempts
        const updateData: Record<string, unknown> = { pin_attempts: newAttempts };
        
        // Lock account if max attempts reached
        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          const lockUntil = new Date();
          lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
          updateData.pin_locked_until = lockUntil.toISOString();
          console.log(`Locking account for user: ${profile.user_id} until ${lockUntil.toISOString()}`);
        }

        await supabase
          .from("profiles")
          .update(updateData)
          .eq("user_id", profile.user_id);

        const attemptsLeft = MAX_PIN_ATTEMPTS - newAttempts;
        return new Response(
          JSON.stringify({
            success: false,
            error:
              attemptsLeft > 0
                ? `Invalid PIN. ${attemptsLeft} attempt(s) remaining.`
                : `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
            attempts_left: attemptsLeft,
            locked: attemptsLeft <= 0,
            minutes_left: attemptsLeft <= 0 ? LOCKOUT_DURATION_MINUTES : undefined,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // PIN is valid - reset attempts
      await supabase
        .from("profiles")
        .update({ pin_attempts: 0, pin_locked_until: null })
        .eq("user_id", profile.user_id);

      console.log(`PIN verified successfully for user: ${profile.user_id}`);
      return new Response(
        JSON.stringify({ success: true, user_id: profile.user_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: CHECK_PIN_EXISTS - Check if user has PIN set
    if (action === "CHECK_PIN_EXISTS") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_id, pin_hash, full_name")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (error || !profile) {
        return new Response(
          JSON.stringify({ exists: false, has_pin: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          exists: true, 
          has_pin: !!profile.pin_hash,
          user_id: profile.user_id,
          full_name: profile.full_name || null
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: REGISTER_USER - Create new user with PIN (for order-first flow)
    if (action === "REGISTER_USER") {
      const { name, address } = await req.json().catch(() => ({}));
      
      if (!email || !pin || !name) {
        return new Response(
          JSON.stringify({ error: "email, pin, and name are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate PIN format
      if (!/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: "PIN must be exactly 4 digits" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "User already exists", exists: true }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user via admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: name }
      });

      if (authError || !authData.user) {
        console.error("Error creating user:", authError);
        return new Response(
          JSON.stringify({ error: authError?.message || "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newUserId = authData.user.id;
      const pinHash = hashSync(pin);

      // Create profile with PIN hash
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: newUserId,
          email: email.toLowerCase().trim(),
          full_name: name,
          pin_hash: pinHash,
          plan: "Free"
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Clean up: delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(newUserId);
        return new Response(
          JSON.stringify({ error: "Failed to create profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create default card
      const { error: cardError } = await supabase
        .from("cards")
        .insert({
          user_id: newUserId,
          name: "My Card",
          is_default: true,
          layout: "dark-professional",
          full_name: name,
          email: email.toLowerCase().trim()
        });

      if (cardError) {
        console.error("Error creating default card:", cardError);
      }

      console.log(`New user registered: ${newUserId}`);

      // Generate session token for immediate login
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email.toLowerCase().trim(),
      });

      if (linkError || !linkData) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            user_id: newUserId,
            message: "User created but session generation failed"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const actionLink = linkData.properties?.action_link;
      const tokenHash = actionLink ? new URL(actionLink).searchParams.get('token') : null;

      return new Response(
        JSON.stringify({
          success: true,
          user_id: newUserId,
          token_hash: tokenHash,
          is_new_user: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: CREATE_SESSION - Create a session for known devices after PIN verification
    // Uses admin API to create user session
    if (action === "CREATE_SESSION") {
      if (!email || !user_id) {
        return new Response(
          JSON.stringify({ error: "email and user_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Creating session for user: ${user_id}, email: ${email}`);

      // Verify the user exists and matches
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user_id)
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (profileError || !profile) {
        console.log(`Profile mismatch for session creation: ${email}`);
        return new Response(
          JSON.stringify({ error: "Invalid user" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use admin API to generate magic link - this contains the hashed_token
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email.toLowerCase().trim(),
      });

      if (error || !data) {
        console.error("Error generating magic link:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Magic link generated for user: ${user_id}`);
      
      // Extract the token_hash from the action_link URL
      // The link format is: {SITE_URL}/auth/v1/verify?token={TOKEN_HASH}&type=magiclink
      const actionLink = data.properties?.action_link;
      if (!actionLink) {
        return new Response(
          JSON.stringify({ error: "Failed to generate session token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse the token_hash from the URL
      const url = new URL(actionLink);
      const tokenHash = url.searchParams.get('token');

      if (!tokenHash) {
        return new Response(
          JSON.stringify({ error: "Failed to extract session token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return the token_hash for client-side verification
      return new Response(
        JSON.stringify({
          success: true,
          token_hash: tokenHash,
          type: 'magiclink',
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("PIN Auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
