import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find all pending deletion requests that are past their scheduled date
    const { data: pendingDeletions, error: fetchError } = await supabase
      .from("deletion_requests")
      .select("id, user_id, reference_number, user_email")
      .eq("status", "pending")
      .lte("scheduled_deletion_at", new Date().toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch pending deletions: ${fetchError.message}`);
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending deletions to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

    for (const deletion of pendingDeletions) {
      try {
        // Delete the user from auth (this will cascade delete profile and related data)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(deletion.user_id);

        if (deleteError) {
          console.error(`Failed to delete user ${deletion.user_id}:`, deleteError);
          results.failed.push(deletion.reference_number);
          continue;
        }

        // Update deletion request status
        await supabase
          .from("deletion_requests")
          .update({ 
            status: "completed", 
            completed_at: new Date().toISOString() 
          })
          .eq("id", deletion.id);

        results.success.push(deletion.reference_number);
        console.log(`Successfully deleted account for ${deletion.reference_number}`);
      } catch (err) {
        console.error(`Error processing deletion ${deletion.reference_number}:`, err);
        results.failed.push(deletion.reference_number);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Deletion processing complete",
        processed: results.success.length,
        failed: results.failed.length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in process-deletions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
