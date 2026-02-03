import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSubscriptionRequest {
  plan_type: "monthly" | "annually";
}

// Server-side pricing - prevents client tampering
const PRICING = {
  monthly: { amount: 299, period: "monthly", interval: 1 },
  annually: { amount: 1999, period: "yearly", interval: 1 },
} as const;

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

    const body: CreateSubscriptionRequest = await req.json();
    const { plan_type } = body;

    // Validate plan type and get server-side pricing
    const planConfig = PRICING[plan_type];
    if (!planConfig) {
      return new Response(JSON.stringify({ error: "Invalid plan type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Plan IDs from Razorpay Dashboard
    const monthlyPlanId = Deno.env.get("RAZORPAY_MONTHLY_PLAN_ID");
    const annualPlanId = Deno.env.get("RAZORPAY_ANNUAL_PLAN_ID");
    const planId = plan_type === "monthly" ? monthlyPlanId : annualPlanId;
    
    console.log("Plan config:", { plan_type, plan_id: planId, amount: planConfig.amount });

    // Get user profile for customer creation
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", user.id)
      .single();

    // Check if plan_id exists (Razorpay Subscription Plans)
    if (planId && planId.trim() !== '') {
      console.log("Using Razorpay Subscriptions API with plan_id:", planId);
      
      // Use Razorpay Subscriptions API for e-mandate
      // Do NOT send customer_notify here — it's a plan-level setting.
      // Do NOT send recurring_token / max_amount here — those must come from the
      // Razorpay checkout options, and only when the plan's type is "emandate".
      // Sending them server-side causes: "The recurring token.max amount field
      // may be sent only when method is emandate"
      const subscriptionPayload: Record<string, any> = {
        plan_id: planId,
        total_count: plan_type === "annually" ? 10 : 120, // Max billing cycles
        notes: {
          user_id: user.id,
          plan_type,
        },
      };

      console.log("Creating Razorpay subscription with payload:", JSON.stringify(subscriptionPayload));

      const razorpayResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        },
        body: JSON.stringify(subscriptionPayload),
      });

      const responseText = await razorpayResponse.text();
      console.log("Razorpay subscription response:", razorpayResponse.status, responseText);

      if (razorpayResponse.ok) {
        const razorpaySubscription = JSON.parse(responseText);
        
        // Calculate provisional dates (webhook will overwrite with Razorpay's actual dates)
        const startDate = new Date();
        const endDate = new Date();
        if (plan_type === "annually") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        // Save subscription to database
        const { data: dbSubscription, error: dbError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan_type,
            amount: planConfig.amount, // Server-side pricing
            status: "pending",
            payment_status: "pending",
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            billing_cycle: plan_type,
            razorpay_subscription_id: razorpaySubscription.id,
            auto_renew: true,
            mandate_created: false,
          })
          .select()
          .single();

        if (dbError) {
          console.error("Database insert error:", dbError);
          return new Response(JSON.stringify({ error: "Failed to save subscription" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            use_subscription_api: true,
            subscription: {
              id: dbSubscription.id,
              razorpay_subscription_id: razorpaySubscription.id,
              amount: planConfig.amount * 100, // In paise for Razorpay checkout
              currency: "INR",
              plan_type,
            },
            prefill: {
              name: profile?.full_name || "",
              email: profile?.email || user.email || "",
              contact: profile?.phone || "",
            },
            key_id: razorpayKeyId,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      // Fall through to order-based flow if subscription creation fails
      console.log("Razorpay subscription creation failed, falling back to order flow");
    }

    // Fallback: Create Razorpay order (non-recurring payment)
    const razorpayOrderPayload = {
      amount: Math.round(planConfig.amount * 100), // Server-side pricing in paise
      currency: "INR",
      receipt: `sub_${Date.now()}`,
      notes: {
        user_id: user.id,
        plan_type,
        type: "subscription",
      },
    };

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify(razorpayOrderPayload),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text();
      console.error("Razorpay order creation failed:", errorData);
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayOrder = await razorpayResponse.json();

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    if (plan_type === "annually") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // FIXED: Save with correct field - razorpay_order_id for orders, not razorpay_subscription_id
    const { data: dbSubscription, error: dbError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_type,
        amount: planConfig.amount, // Server-side pricing
        status: "pending",
        payment_status: "pending",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        billing_cycle: plan_type,
        transaction_id: razorpayOrder.id, // Store order ID in transaction_id
        auto_renew: false, // Order-based subscriptions don't auto-renew
        mandate_created: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        use_subscription_api: false,
        subscription: {
          id: dbSubscription.id,
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          plan_type,
        },
        prefill: {
          name: profile?.full_name || "",
          email: profile?.email || user.email || "",
          contact: profile?.phone || "",
        },
        key_id: razorpayKeyId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Create subscription error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
