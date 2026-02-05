import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check for manual deletion action from admin
    const body = await req.json().catch(() => ({}));
    
    if (body.action === "delete_single" && body.user_id && body.request_id) {
      // Single user deletion triggered by admin
      console.log(`Admin requested deletion for user ${body.user_id}`);

      // Delete the user from auth (this will cascade delete profile and related data)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        body.user_id
      );

      if (deleteError) {
        console.error(`Failed to delete user ${body.user_id}:`, deleteError);
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Update the deletion request status
      await supabase
        .from("deletion_requests")
        .update({
          status: "approved",
          completed_at: new Date().toISOString(),
        })
        .eq("id", body.request_id);

      console.log(`Successfully deleted user ${body.user_id}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          user_id: body.user_id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Default response for other calls
    return new Response(
      JSON.stringify({
        message: "No action specified",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in process-deletions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
