import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

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

// Timing-safe comparison
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
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.error("No signature provided");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature with timing-safe comparison
    const generatedSignatureBytes = await hmacSha256(webhookSecret, rawBody);
    const generatedHex = toHexString(generatedSignatureBytes);
    const generatedHexBytes = new TextEncoder().encode(generatedHex);
    const providedSignatureBytes = new TextEncoder().encode(signature);

    if (!timingSafeEqual(generatedHexBytes, providedSignatureBytes)) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const payload = event.payload;

    console.log("Received webhook event:", eventType);

    switch (eventType) {
      case "payment.captured": {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;
        const paymentId = payment.id;
        const subscriptionId = payment.subscription_id; // FIXED: Use subscription_id not order_id
        const amount = payment.amount / 100;

        console.log("Payment captured:", paymentId, "order:", orderId, "subscription:", subscriptionId);

        // Idempotency check: Skip if payment already recorded
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("razorpay_payment_id", paymentId)
          .maybeSingle();

        if (existingPayment) {
          console.log("Payment already processed, skipping:", paymentId);
          break;
        }

        // Update order status if this is an order payment
        if (orderId) {
          const { data: order, error: orderError } = await supabase
            .from("orders")
            .update({
              status: "paid",
              razorpay_payment_id: paymentId,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_order_id", orderId)
            .select()
            .single();

          if (!orderError && order) {
            await supabase.from("payments").insert({
              user_id: order.user_id,
              order_id: order.id,
              razorpay_payment_id: paymentId,
              razorpay_order_id: orderId,
              amount,
              status: "captured",
              method: payment.method,
            });
          }
        }

        // FIXED: Check subscription using subscription_id, not order_id
        if (subscriptionId) {
          const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              payment_status: "paid",
              razorpay_payment_id: paymentId,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", subscriptionId)
            .select()
            .single();

          if (!subError && subscription) {
            // Activate user plan
            await supabase.rpc("activate_user_subscription", {
              p_user_id: subscription.user_id,
              p_plan_type: subscription.plan_type,
              p_end_date: subscription.end_date,
            });

            await supabase.from("payments").insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              razorpay_payment_id: paymentId,
              razorpay_order_id: orderId,
              amount,
              status: "captured",
              method: payment.method,
            });
          }
        }

        break;
      }

      case "payment.failed": {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;
        const paymentId = payment.id;
        const subscriptionId = payment.subscription_id; // FIXED: Use subscription_id
        const errorCode = payment.error_code;
        const errorDescription = payment.error_description;

        console.log("Payment failed:", paymentId, "Error:", errorCode, errorDescription);

        // Idempotency check
        const { data: existingPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("razorpay_payment_id", paymentId)
          .maybeSingle();

        if (existingPayment) {
          console.log("Failed payment already recorded, skipping:", paymentId);
          break;
        }

        // Update order status
        if (orderId) {
          const { data: order } = await supabase
            .from("orders")
            .update({
              status: "failed",
              razorpay_payment_id: paymentId,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_order_id", orderId)
            .select()
            .single();

          if (order) {
            await supabase.from("payments").insert({
              user_id: order.user_id,
              order_id: order.id,
              razorpay_payment_id: paymentId,
              razorpay_order_id: orderId,
              amount: payment.amount / 100,
              status: "failed",
              error_code: errorCode,
              error_description: errorDescription,
            });
          }
        }

        // FIXED: Update subscription using subscription_id
        if (subscriptionId) {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .update({
              payment_status: "failed",
              razorpay_payment_id: paymentId,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", subscriptionId)
            .select()
            .single();

          if (subscription) {
            await supabase.from("payments").insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              razorpay_payment_id: paymentId,
              razorpay_order_id: orderId,
              amount: payment.amount / 100,
              status: "failed",
              error_code: errorCode,
              error_description: errorDescription,
            });
          }
        }

        break;
      }

      case "order.paid": {
        const order = payload.order.entity;
        console.log("Order paid:", order.id);
        // Already handled by payment.captured
        break;
      }

      case "subscription.authenticated": {
        // E-mandate successfully created
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          console.log("E-mandate authenticated for subscription:", razorpaySubId);

          // IMPORTANT: For resumed subscriptions we often get `subscription.authenticated`
          // immediately (₹5 auth), while the first paid cycle might be deferred.
          // We must clear `cancelled_at` and re-enable `auto_renew` so the UI stops
          // showing “Cancelled / Resume” right after mandate auth succeeds.
          const { data: subscription, error: authUpdateErr } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              mandate_created: true,
              auto_renew: true,
              cancelled_at: null,
              cancellation_reason: null,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", razorpaySubId)
            .select()
            .maybeSingle();

          if (authUpdateErr) {
            console.error("Failed to update subscription on authenticated:", authUpdateErr);
          }

          // Keep user on Orange (idempotent)
          if (subscription) {
            await supabase.rpc("activate_user_subscription", {
              p_user_id: subscription.user_id,
              p_plan_type: subscription.plan_type,
              p_end_date: subscription.end_date,
            });
          }
        }
        break;
      }

      case "subscription.resumed": {
        // Subscription was resumed after being paused/cancelled
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          console.log("Subscription resumed:", razorpaySubId);

          const { data: subscription, error: resumeErr } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              auto_renew: true,
              cancelled_at: null,
              cancellation_reason: null,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", razorpaySubId)
            .select()
            .maybeSingle();

          if (resumeErr) {
            console.error("Failed to update subscription on resumed:", resumeErr);
          }

          // Ensure user stays on Orange
          if (subscription) {
            await supabase.rpc("activate_user_subscription", {
              p_user_id: subscription.user_id,
              p_plan_type: subscription.plan_type,
              p_end_date: subscription.end_date,
            });
          }
        }
        break;
      }

      case "subscription.paused": {
        // Subscription was paused
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          console.log("Subscription paused:", razorpaySubId);

          await supabase
            .from("subscriptions")
            .update({
              status: "paused",
              auto_renew: false,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", razorpaySubId);

          // User keeps access until end_date - no downgrade on pause
        }
        break;
      }

      case "subscription.activated": {
        // Subscription is now active (first payment successful)
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          // Use Razorpay's current_end timestamp if available
          const currentEnd = subscriptionEntity.current_end 
            ? new Date(subscriptionEntity.current_end * 1000).toISOString()
            : null;
          
          console.log("Subscription activated:", razorpaySubId, "current_end:", currentEnd);
          
          const updateData: Record<string, unknown> = {
            status: "active",
            payment_status: "paid",
            mandate_created: true,
            auto_renew: true,
            updated_at: new Date().toISOString(),
          };

          // Use Razorpay's timestamps if available
          if (currentEnd) {
            updateData.end_date = currentEnd;
            updateData.current_period_end = currentEnd;
          }

          const { data: subscription } = await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("razorpay_subscription_id", razorpaySubId)
            .select()
            .single();

          // Activate user plan
          if (subscription) {
            await supabase.rpc("activate_user_subscription", {
              p_user_id: subscription.user_id,
              p_plan_type: subscription.plan_type,
              p_end_date: subscription.end_date,
            });
          }
        }
        break;
      }

      case "subscription.charged": {
        // Handle subscription renewal
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          // Use Razorpay's current_end timestamp
          const currentEnd = subscriptionEntity.current_end 
            ? new Date(subscriptionEntity.current_end * 1000).toISOString()
            : null;
          
          console.log("Subscription charged (renewal):", razorpaySubId, "new end:", currentEnd);
          
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("razorpay_subscription_id", razorpaySubId)
            .single();

          if (subscription) {
            let newEndDate: string;
            
            if (currentEnd) {
              // Prefer Razorpay's timestamp
              newEndDate = currentEnd;
            } else {
              // Fallback to manual calculation
              const endDateObj = new Date(subscription.end_date);
              if (subscription.plan_type === "annually") {
                endDateObj.setFullYear(endDateObj.getFullYear() + 1);
              } else {
                endDateObj.setMonth(endDateObj.getMonth() + 1);
              }
              newEndDate = endDateObj.toISOString();
            }

            await supabase
              .from("subscriptions")
              .update({
                end_date: newEndDate,
                current_period_end: newEndDate,
                status: "active",
                payment_status: "paid",
                updated_at: new Date().toISOString(),
              })
              .eq("id", subscription.id);

            // Ensure user plan is still active
            await supabase.rpc("activate_user_subscription", {
              p_user_id: subscription.user_id,
              p_plan_type: subscription.plan_type,
              p_end_date: newEndDate,
            });
          }
        }
        break;
      }

      case "subscription.pending": {
        // Payment is pending retry - subscription still active
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          console.log("Subscription pending (payment retry in progress):", razorpaySubId);
          
          await supabase
            .from("subscriptions")
            .update({
              payment_status: "pending",
              notes: { pending_reason: "Payment retry in progress" },
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", razorpaySubId);
          
          // User KEEPS access during pending state - no downgrade
        }
        break;
      }

      case "subscription.halted": {
        // All payment retries failed - subscription halted, downgrade user
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          console.log("Subscription halted (payment failed after retries):", razorpaySubId);
          
          const { data: subscription } = await supabase
            .from("subscriptions")
            .update({
              status: "halted",
              payment_status: "failed",
              auto_renew: false,
              cancellation_reason: "Payment failed after all retries",
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", razorpaySubId)
            .select()
            .single();

          // Downgrade user immediately since payment completely failed
          if (subscription) {
            console.log("Downgrading user due to halted subscription:", subscription.user_id);
            
            await supabase
              .from("profiles")
              .update({ plan: "Free", updated_at: new Date().toISOString() })
              .eq("user_id", subscription.user_id);

            await supabase
              .from("user_roles")
              .delete()
              .eq("user_id", subscription.user_id)
              .eq("role", "orange");

            await supabase
              .from("user_roles")
              .upsert({ user_id: subscription.user_id, role: "free" }, { onConflict: 'user_id,role' });

            await supabase.from("plan_history").insert({
              user_id: subscription.user_id,
              old_plan: "Orange",
              new_plan: "Free",
              changed_by: null,
            });
          }
        }
        break;
      }

      case "subscription.cancelled": {
        // User cancelled - subscription remains active until end_date
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          const cancelledBy = subscriptionEntity.cancelled_by; // "user" or "bank" or "system"
          
          console.log("Subscription cancelled by:", cancelledBy, "ID:", razorpaySubId);
          
          // Mark as cancelled but DON'T downgrade - keep active until end_date
          await supabase
            .from("subscriptions")
            .update({
              auto_renew: false,
              cancelled_at: new Date().toISOString(),
              cancellation_reason: cancelledBy === "bank" 
                ? "E-mandate cancelled by bank" 
                : cancelledBy === "user" 
                  ? "Cancelled by user" 
                  : "E-mandate cancelled via Razorpay",
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", razorpaySubId);

          console.log("Subscription cancelled (user keeps access until end_date):", razorpaySubId);
        }
        break;
      }

      // FIXED: subscription.completed replaces subscription.expired (Razorpay does NOT send expired)
      case "subscription.completed": {
        // Subscription period ended after all cycles completed - NOW downgrade user
        const subscriptionEntity = payload.subscription?.entity;
        if (subscriptionEntity) {
          const razorpaySubId = subscriptionEntity.id;
          
          const { data: subscription } = await supabase
            .from("subscriptions")
            .update({
              status: "completed",
              auto_renew: false,
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", razorpaySubId)
            .select()
            .single();

          // NOW downgrade user plan since subscription has truly completed
          if (subscription) {
            console.log("Subscription completed, downgrading user:", subscription.user_id);
            
            await supabase
              .from("profiles")
              .update({ plan: "Free", updated_at: new Date().toISOString() })
              .eq("user_id", subscription.user_id);

            await supabase
              .from("user_roles")
              .delete()
              .eq("user_id", subscription.user_id)
              .eq("role", "orange");

            await supabase
              .from("user_roles")
              .upsert({ user_id: subscription.user_id, role: "free" }, { onConflict: 'user_id,role' });

            await supabase.from("plan_history").insert({
              user_id: subscription.user_id,
              old_plan: "Orange",
              new_plan: "Free",
              changed_by: null,
            });
          }
        }
        break;
      }

      default:
        console.log("Unhandled event type:", eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
