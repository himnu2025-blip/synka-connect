import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  product_type: "pvc" | "metal" | "orange_upgrade";
  amount: number; // Client passes amount for NFC orders
  quantity?: number;
  card_variant?: string;
  notes?: Record<string, string>;
}

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

    const body: CreateOrderRequest = await req.json();
    const { product_type, amount, quantity = 1, card_variant, notes = {} } = body;

    // Validate product type
    if (!["pvc", "metal", "orange_upgrade"].includes(product_type)) {
      return new Response(JSON.stringify({ error: "Invalid product type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Order details:", { product_type, amount, quantity, card_variant });

    // Create Razorpay order
    const razorpayOrderPayload = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
      notes: {
        user_id: user.id,
        product_type,
        ...notes,
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

    // Save order to database with server-side calculated amount
    const { data: dbOrder, error: dbError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_type,
        amount, // Server-calculated amount
        quantity,
        card_variant,
        razorpay_order_id: razorpayOrder.id,
        status: "pending",
        currency: "INR",
        notes,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile for prefill
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: dbOrder.id,
          order_number: dbOrder.order_number,
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
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
    console.error("Create order error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
