import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  type: "order" | "subscription";
  subscription_id?: string;
  order_id?: string;
}

// HMAC-SHA256 implementation
async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return new Uint8Array(signature);
}

// Convert Uint8Array to hex string
function toHexString(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Timing-safe comparison to prevent timing attacks
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const body: VerifyPaymentRequest = await req.json();
    const { razorpay_order_id, razorpay_subscription_id, razorpay_payment_id, razorpay_signature, type, subscription_id } = body;

    // Verify signature using timing-safe comparison
    let isValidSignature = false;
    
    if (razorpay_subscription_id) {
      // For Razorpay Subscription API, signature is: subscription_id|payment_id
      const message = `${razorpay_subscription_id}|${razorpay_payment_id}`;
      const generatedSignatureBytes = await hmacSha256(razorpayKeySecret, message);
      const providedSignatureBytes = new TextEncoder().encode(razorpay_signature);
      const generatedHex = toHexString(generatedSignatureBytes);
      const generatedHexBytes = new TextEncoder().encode(generatedHex);
      
      isValidSignature = timingSafeEqual(generatedHexBytes, providedSignatureBytes);
    } else if (razorpay_order_id) {
      // For standard orders, signature is: order_id|payment_id
      const message = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignatureBytes = await hmacSha256(razorpayKeySecret, message);
      const providedSignatureBytes = new TextEncoder().encode(razorpay_signature);
      const generatedHex = toHexString(generatedSignatureBytes);
      const generatedHexBytes = new TextEncoder().encode(generatedHex);
      
      isValidSignature = timingSafeEqual(generatedHexBytes, providedSignatureBytes);
    }

    if (!isValidSignature) {
      console.error("Signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Signature is valid - process the payment
    // Note: This is a UX helper. Webhook remains the source of truth for final state.
    if (type === "subscription" && subscription_id) {
      // Check if this is a Razorpay Subscription (with e-mandate)
      const isRazorpaySubscription = !!razorpay_subscription_id;
      
      // Update subscription with mandate status
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          payment_status: "paid",
          razorpay_payment_id,
          razorpay_signature,
          razorpay_subscription_id: razorpay_subscription_id || undefined,
          mandate_created: isRazorpaySubscription,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription_id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (subError) {
        console.error("Subscription update error:", subError);
        return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Activate user plan
      const { error: activateError } = await supabase.rpc("activate_user_subscription", {
        p_user_id: user.id,
        p_plan_type: subscription.plan_type,
        p_end_date: subscription.end_date,
      });

      if (activateError) {
        console.error("Plan activation error:", activateError);
      }

      // Record payment with idempotency check
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("razorpay_payment_id", razorpay_payment_id)
        .maybeSingle();

      if (!existingPayment) {
        await supabase.from("payments").insert({
          user_id: user.id,
          subscription_id,
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          amount: subscription.amount,
          status: "captured",
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription activated successfully",
          subscription: {
            id: subscription.id,
            plan_type: subscription.plan_type,
            status: subscription.status,
            end_date: subscription.end_date,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (type === "order") {
      // Update order by razorpay_order_id
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          razorpay_payment_id,
          razorpay_signature,
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", razorpay_order_id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (orderError) {
        console.error("Order update error:", orderError);
        return new Response(JSON.stringify({ error: "Failed to update order" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record payment with idempotency check
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("razorpay_payment_id", razorpay_payment_id)
        .maybeSingle();

      if (!existingPayment) {
        await supabase.from("payments").insert({
          user_id: user.id,
          order_id: order.id,
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          amount: order.amount,
          status: "captured",
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment verified successfully",
          order: {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid payment type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
