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
    const { action, sessionId, userInfo, reason } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Session action: ${action} for session ${sessionId || "N/A"}`);

    // Get bot messages from config + latest knowledge_base version stamp
    if (action === "get_messages") {
      // Fetch bot messages
      const { data: config } = await supabase
        .from("bot_config")
        .select("config_value")
        .eq("config_key", "messages")
        .maybeSingle();

      // Fetch latest knowledge_base updated_at as version stamp
      const { data: kbLatest } = await supabase
        .from("knowledge_base")
        .select("updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const kbVersion = kbLatest?.updated_at || null;

      const messages = config?.config_value || {
        welcome: "Hi, I'm Saira — Synka's AI assistant.\nHow can I help you today?",
        form_intro: "Before we begin, please share a few details so I can assist you better.",
        warning: "Just checking — are we still connected?",
        goodbye_with_name: "Thanks for chatting, {{name}}! Have a great day! 👋",
        goodbye: "Thanks for chatting! Have a great day! 👋",
        error: "I'm having trouble connecting. Please try again!",
        greeting_existing: "Hi {{name}} 👋 Great to see you again!\nWhat can I help you with?",
        greeting_new: "Hi {{name}} 👋 Welcome to Synka!\nHow can I help you today?",
      };

      return new Response(
        JSON.stringify({ success: true, messages, kbVersion }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      // Check if user exists in profiles by email or phone
      let isExistingUser = false;
      let existingUserName = "";

      if (userInfo?.email || userInfo?.mobile) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .or(`email.eq.${userInfo.email || ""},phone.eq.${userInfo.mobile || ""}`)
          .maybeSingle();

        if (existingProfile) {
          isExistingUser = true;
          existingUserName = existingProfile.full_name || "";
          console.log(`Found existing user: ${existingUserName}`);
        }
      }

      // Get greeting message from config
      const { data: config } = await supabase
        .from("bot_config")
        .select("config_value")
        .eq("config_key", "messages")
        .maybeSingle();

      const messages = config?.config_value || {};
      const firstName = userInfo?.name?.split(" ")[0] || "";
      
      // Simple greeting with name - only used in greeting, not repeated
      let greetingMessage = isExistingUser
        ? (messages.greeting_existing || "Hi {{name}} 👋 Great to see you again!\nWhat can I help you with?")
        : (messages.greeting_new || "Hi {{name}} 👋 Welcome to Synka!\nHow can I help you today?");
      
      greetingMessage = greetingMessage.replace(/\{\{name\}\}/g, firstName);

      // Create or update session in chat_sessions table
      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .upsert({
          session_id: sessionId,
          name: userInfo?.name || null,
          email: userInfo?.email || null,
          mobile: userInfo?.mobile || null,
          status: "active",
          started_at: new Date().toISOString(),
          is_user: isExistingUser,
        }, { onConflict: "session_id" });

      if (sessionError) {
        console.error("Error creating session:", sessionError);
      }

      // Initialize session memory with new personality fields
      const { error: memoryError } = await supabase
        .from("chat_session_memory")
        .upsert({
          session_id: sessionId,
          user_info: {
            name: userInfo?.name || "",
            email: userInfo?.email || "",
            mobile: userInfo?.mobile || "",
            isExistingUser,
          },
          message_count: 0,
          conversation_summary: "",
          detected_intents: [],
          context_data: {},
          // New personality fields
          followups_done: [],
          last_intent: null,
          ended: false,
          pending_followup: null, // No pending follow-up on session start
        }, { onConflict: "session_id" });

      if (memoryError) {
        console.error("Error creating session memory:", memoryError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          isExistingUser, 
          existingUserName,
          greetingMessage,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "end") {
      // Get goodbye message from config
      const { data: config } = await supabase
        .from("bot_config")
        .select("config_value")
        .eq("config_key", "messages")
        .maybeSingle();

      const messages = config?.config_value || {};
      const firstName = userInfo?.name?.split(" ")[0] || "";
      
      // Simple goodbye with name
      let goodbyeMessage = firstName
        ? (messages.goodbye_with_name || "Thanks for chatting, {{name}}! Have a great day! 👋")
        : (messages.goodbye || "Thanks for chatting! Have a great day! 👋");
      
      goodbyeMessage = goodbyeMessage.replace(/\{\{name\}\}/g, firstName);

      // Update session status
      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          timeout_reason: reason || "user_ended",
        })
        .eq("session_id", sessionId);

      if (sessionError) {
        console.error("Error ending session:", sessionError);
      }

      // Mark session as ended in memory and clear pending followup
      await supabase
        .from("chat_session_memory")
        .update({ ended: true, pending_followup: null })
        .eq("session_id", sessionId);

      return new Response(
        JSON.stringify({ success: true, goodbyeMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("saira-session error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
