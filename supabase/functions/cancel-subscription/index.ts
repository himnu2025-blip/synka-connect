import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active subscription for user
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: "No active subscription found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Cancelling subscription:", subscription.id, "Razorpay ID:", subscription.razorpay_subscription_id);

    // If subscription has a Razorpay subscription ID (e-mandate), cancel it in Razorpay
    if (subscription.razorpay_subscription_id && subscription.mandate_created) {
      try {
        // Cancel at end of current billing period (cancel_at_cycle_end)
        const razorpayResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
            },
            body: JSON.stringify({
              cancel_at_cycle_end: 1, // Cancel at end of current period, not immediately
            }),
          }
        );

        const responseText = await razorpayResponse.text();
        console.log("Razorpay cancel response:", razorpayResponse.status, responseText);

        if (!razorpayResponse.ok) {
          console.error("Razorpay cancellation failed:", responseText);
          // Continue to update local subscription even if Razorpay fails
        }
      } catch (razorpayError) {
        console.error("Razorpay API error:", razorpayError);
        // Continue to update local subscription
      }
    }

    // Update subscription in database
    // Keep status as "active" but set auto_renew to false and record cancellation
    const { data: updatedSub, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "User requested cancellation",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to cancel subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate and format the end date for user display
    const endDate = new Date(subscription.end_date);
    const formattedEndDate = endDate.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Your subscription has been cancelled. You will continue to have access to premium features until ${formattedEndDate}.`,
        subscription: {
          id: updatedSub.id,
          status: updatedSub.status,
          end_date: updatedSub.end_date,
          plan_type: updatedSub.plan_type,
          auto_renew: updatedSub.auto_renew,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
