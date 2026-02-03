import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side pricing — single source of truth
const PRICING = {
  monthly:  { amount: 299 },
  annually: { amount: 1999 },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl       = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId     = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const monthlyPlanId     = Deno.env.get("RAZORPAY_MONTHLY_PLAN_ID");
    const annualPlanId      = Deno.env.get("RAZORPAY_ANNUAL_PLAN_ID");

    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token    = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Find the cancelled-mandate-but-still-paid subscription ───────
    // status = active  →  plan is still running (not downgraded yet)
    // cancelled_at IS NOT NULL  →  the e-mandate / auto-renew was cancelled
    // end_date >= now()  →  the paid period hasn't expired yet
    const { data: oldSub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .not("cancelled_at", "is", null)
      .gte("end_date", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!oldSub) {
      return new Response(JSON.stringify({ error: "No resumable subscription found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan_type: "monthly" | "annually" = oldSub.plan_type;
    const planConfig = PRICING[plan_type];
    const planId     = plan_type === "monthly" ? monthlyPlanId : annualPlanId;

    // ── User profile for prefill ──────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", user.id)
      .single();

    // ── Try Razorpay Subscriptions API first (e-mandate) ─────────────
    if (planId && planId.trim() !== "") {
      const payload: Record<string, any> = {
        plan_id:    planId,
        total_count: plan_type === "annually" ? 10 : 120,
        notes:      { user_id: user.id, plan_type, resumed_from: oldSub.id },
      };

      console.log("Resume — creating Razorpay subscription:", JSON.stringify(payload));

      const rpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        },
        body: JSON.stringify(payload),
      });

      const rpText = await rpRes.text();
      console.log("Razorpay resume response:", rpRes.status, rpText);

      if (rpRes.ok) {
        const rpSub = JSON.parse(rpText);

        const startDate = new Date();
        const endDate   = new Date();
        if (plan_type === "annually") endDate.setFullYear(endDate.getFullYear() + 1);
        else                           endDate.setMonth(endDate.getMonth() + 1);

        // New subscription row — keeps the old cancelled one as history
        const { data: dbSub, error: dbErr } = await supabase
          .from("subscriptions")
          .insert({
            user_id:                  user.id,
            plan_type,
            amount:                   planConfig.amount,
            status:                   "pending",
            payment_status:           "pending",
            start_date:               startDate.toISOString(),
            end_date:                 endDate.toISOString(),
            current_period_start:     startDate.toISOString(),
            current_period_end:       endDate.toISOString(),
            billing_cycle:            plan_type,
            razorpay_subscription_id: rpSub.id,
            auto_renew:               true,
            mandate_created:          false,
            notes:                    { resumed_from: oldSub.id },
          })
          .select()
          .single();

        if (dbErr) {
          console.error("DB insert error on resume:", dbErr);
          return new Response(JSON.stringify({ error: "Failed to save resumed subscription" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            success:              true,
            use_subscription_api: true,
            subscription: {
              id:                       dbSub.id,
              razorpay_subscription_id: rpSub.id,
              amount:                   planConfig.amount * 100, // paise
              currency:                 "INR",
              plan_type,
            },
            prefill: {
              name:    profile?.full_name || "",
              email:   profile?.email || user.email || "",
              contact: profile?.phone  || "",
            },
            key_id: razorpayKeyId,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Razorpay subscription creation failed on resume, falling back to order flow");
    }

    // ── Fallback: one-time order ──────────────────────────────────────
    const orderPayload = {
      amount:   Math.round(planConfig.amount * 100),
      currency: "INR",
      receipt:  `resume_${Date.now()}`,
      notes:    { user_id: user.id, plan_type, type: "subscription", resumed_from: oldSub.id },
    };

    const rpOrderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!rpOrderRes.ok) {
      console.error("Razorpay order creation failed on resume:", await rpOrderRes.text());
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rpOrder = await rpOrderRes.json();

    const startDate = new Date();
    const endDate   = new Date();
    if (plan_type === "annually") endDate.setFullYear(endDate.getFullYear() + 1);
    else                           endDate.setMonth(endDate.getMonth() + 1);

    const { data: dbSub, error: dbErr } = await supabase
      .from("subscriptions")
      .insert({
        user_id:              user.id,
        plan_type,
        amount:               planConfig.amount,
        status:               "pending",
        payment_status:       "pending",
        start_date:           startDate.toISOString(),
        end_date:             endDate.toISOString(),
        current_period_start: startDate.toISOString(),
        current_period_end:   endDate.toISOString(),
        billing_cycle:        plan_type,
        transaction_id:       rpOrder.id,
        auto_renew:           false,
        mandate_created:      false,
        notes:                { resumed_from: oldSub.id },
      })
      .select()
      .single();

    if (dbErr) {
      console.error("DB insert error on resume (order fallback):", dbErr);
      return new Response(JSON.stringify({ error: "Failed to save resumed subscription" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success:              true,
        use_subscription_api: false,
        subscription: {
          id:                dbSub.id,
          razorpay_order_id: rpOrder.id,
          amount:            rpOrder.amount,
          currency:          rpOrder.currency,
          plan_type,
        },
        prefill: {
          name:    profile?.full_name || "",
          email:   profile?.email || user.email || "",
          contact: profile?.phone  || "",
        },
        key_id: razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Resume subscription error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
