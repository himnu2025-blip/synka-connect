import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOptions {
  product_type: "pvc" | "metal" | "orange_upgrade";
  amount: number; // Client-side pricing for NFC orders
  quantity?: number;
  card_variant?: string;
  onSuccess?: (response: any) => void;
  onFailure?: (error: any) => void;
}

interface SubscriptionOptions {
  plan_type: "monthly" | "annually";
  onSuccess?: (response: any) => void;
  onFailure?: (error: any) => void;
}

// Check if running in native Capacitor app
const isNativePlatform = () => Capacitor.isNativePlatform();

// Get callback URL based on platform
const getCallbackUrl = () => {
  if (isNativePlatform()) {
    // For native apps, use deep link scheme
    return 'synka://payment/callback';
  }
  // For web, use the current origin
  return window.location.origin;
};

export function useRazorpay() {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const initiatePayment = useCallback(
    async (options: PaymentOptions) => {
      setLoading(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load Razorpay SDK");
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Please login to continue");
        }

        // Create order on server
        const response = await supabase.functions.invoke("create-order", {
          body: {
            product_type: options.product_type,
            amount: options.amount,
            quantity: options.quantity || 1,
            card_variant: options.card_variant,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || "Failed to create order");
        }

        const { order, prefill, key_id } = response.data;

        // Configure Razorpay options - INR only
        // Add native app specific configurations for Android/iOS
        const razorpayOptions: any = {
          key: key_id,
          amount: order.amount,
          currency: order.currency,
          name: "Synka",
          description: `Order: ${order.order_number}`,
          order_id: order.razorpay_order_id,
          prefill: {
            name: prefill.name,
            email: prefill.email,
            contact: prefill.contact,
          },
          config: {
            display: {
              hide: [{ method: "wallet" }],
              preferences: { show_default_blocks: true },
            },
          },
          theme: {
            color: "#F97316",
          },
          // Enable UPI intent for native apps (Android)
          ...(isNativePlatform() && {
            callback_url: getCallbackUrl(),
            redirect: false, // Keep in WebView
          }),
          handler: async (razorpayResponse: any) => {
            try {
              // Verify payment on server
              const verifyResponse = await supabase.functions.invoke("verify-payment", {
                body: {
                  razorpay_order_id: razorpayResponse.razorpay_order_id,
                  razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                  razorpay_signature: razorpayResponse.razorpay_signature,
                  type: "order",
                },
              });

              if (verifyResponse.error) {
                throw new Error("Payment verification failed");
              }

              toast.success("Payment successful!");
              options.onSuccess?.(verifyResponse.data);
            } catch (error) {
              console.error("Payment verification error:", error);
              toast.error("Payment verification failed. Please contact support.");
              options.onFailure?.(error);
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              toast.info("Payment cancelled");
              options.onFailure?.({ message: "Payment cancelled by user" });
            },
            // Escape handling for native apps
            escape: !isNativePlatform(),
            backdropclose: false,
          },
        };

        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.on("payment.failed", async (response: any) => {
          console.error("Payment failed:", response.error);
          toast.error(response.error.description || "Payment failed");
          
          // Update order status to payment_failed
          try {
            await supabase
              .from("orders")
              .update({ 
                status: "payment_failed",
                updated_at: new Date().toISOString(),
              })
              .eq("razorpay_order_id", order.razorpay_order_id);
            
            // Record failed payment
            await supabase.from("payments").insert({
              user_id: session.user.id,
              order_id: order.id,
              razorpay_order_id: order.razorpay_order_id,
              amount: order.amount / 100, // Convert from paise
              status: "failed",
              error_code: response.error?.code,
              error_description: response.error?.description,
            });
          } catch (err) {
            console.error("Failed to update order status:", err);
          }
          
          options.onFailure?.(response.error);
          setLoading(false);
        });
        razorpay.open();
      } catch (error: any) {
        console.error("Payment initiation error:", error);
        toast.error(error.message || "Failed to initiate payment");
        options.onFailure?.(error);
      } finally {
        setLoading(false);
      }
    },
    [loadRazorpayScript]
  );

  const initiateSubscription = useCallback(
    async (options: SubscriptionOptions) => {
      setLoading(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load Razorpay SDK");
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Please login to continue");
        }

        // Create subscription on server
        const response = await supabase.functions.invoke("create-subscription", {
          body: {
            plan_type: options.plan_type,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || "Failed to create subscription");
        }

        const { subscription, prefill, key_id, use_subscription_api } = response.data;

        // Configure Razorpay options based on API type
        let razorpayOptions: any;

        if (use_subscription_api && subscription.razorpay_subscription_id) {
          // Use Razorpay Subscription checkout (supports e-mandate)
          // Note: Do NOT pass recurring_token / max_amount here.
          // Razorpay only allows those when the payment method is emandate,
          // but the method isn't known at checkout-open time.  The plan
          // configured in the Razorpay Dashboard already defines the amount
          // and recurrence rules.
          razorpayOptions = {
            key: key_id,
            subscription_id: subscription.razorpay_subscription_id,
            name: "Synka",
            description: `Orange Plan - ${options.plan_type === "annually" ? "Annual" : "Monthly"} (Auto-renewal)`,
            prefill: {
              name: prefill.name,
              email: prefill.email,
              contact: prefill.contact,
            },
            theme: {
              color: "#F97316",
            },
            // Enable UPI intent for native apps (Android)
            ...(isNativePlatform() && {
              callback_url: getCallbackUrl(),
              redirect: false,
            }),
            handler: async (razorpayResponse: any) => {
              try {
                // Verify payment on server
                const verifyResponse = await supabase.functions.invoke("verify-payment", {
                  body: {
                    razorpay_subscription_id: razorpayResponse.razorpay_subscription_id,
                    razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                    razorpay_signature: razorpayResponse.razorpay_signature,
                    type: "subscription",
                    subscription_id: subscription.id,
                  },
                });

                if (verifyResponse.error) {
                  throw new Error("Payment verification failed");
                }

                toast.success("Subscription activated with auto-renewal! Welcome to Orange!");
                options.onSuccess?.(verifyResponse.data);
              } catch (error) {
                console.error("Payment verification error:", error);
                toast.error("Payment verification failed. Please contact support.");
                options.onFailure?.(error);
              }
            },
            modal: {
              ondismiss: () => {
                setLoading(false);
                toast.info("Payment cancelled");
                options.onFailure?.({ message: "Payment cancelled by user" });
              },
              escape: !isNativePlatform(),
              backdropclose: false,
            },
          };
        } else {
          // Fallback to order-based checkout
          razorpayOptions = {
            key: key_id,
            amount: subscription.amount,
            currency: subscription.currency,
            name: "Synka",
            description: `Orange Plan - ${options.plan_type === "annually" ? "Annual" : "Monthly"}`,
            order_id: subscription.razorpay_order_id,
            prefill: {
              name: prefill.name,
              email: prefill.email,
              contact: prefill.contact,
            },
            config: {
              display: {
                hide: [{ method: "wallet" }],
                preferences: { show_default_blocks: true },
              },
            },
            theme: {
              color: "#F97316",
            },
            // Enable UPI intent for native apps (Android)
            ...(isNativePlatform() && {
              callback_url: getCallbackUrl(),
              redirect: false,
            }),
            handler: async (razorpayResponse: any) => {
              try {
                // Verify payment on server
                const verifyResponse = await supabase.functions.invoke("verify-payment", {
                  body: {
                    razorpay_order_id: razorpayResponse.razorpay_order_id,
                    razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                    razorpay_signature: razorpayResponse.razorpay_signature,
                    type: "subscription",
                    subscription_id: subscription.id,
                  },
                });

                if (verifyResponse.error) {
                  throw new Error("Payment verification failed");
                }

                toast.success("Subscription activated! Welcome to Orange!");
                options.onSuccess?.(verifyResponse.data);
              } catch (error) {
                console.error("Payment verification error:", error);
                toast.error("Payment verification failed. Please contact support.");
                options.onFailure?.(error);
              }
            },
            modal: {
              ondismiss: () => {
                setLoading(false);
                toast.info("Payment cancelled");
                options.onFailure?.({ message: "Payment cancelled by user" });
              },
              escape: !isNativePlatform(),
              backdropclose: false,
            },
          };
        }

        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.on("payment.failed", async (response: any) => {
          console.error("Payment failed:", response.error);
          toast.error(response.error.description || "Payment failed");
          
          // Update subscription status to failed
          if (subscription.id) {
            try {
              await supabase
                .from("subscriptions")
                .update({ 
                  payment_status: "failed",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", subscription.id);
              
              // Record failed payment
              await supabase.from("payments").insert({
                user_id: session.user.id,
                subscription_id: subscription.id,
                razorpay_order_id: subscription.razorpay_order_id || null,
                razorpay_subscription_id: subscription.razorpay_subscription_id || null,
                amount: subscription.amount / 100, // Convert from paise
                status: "failed",
                error_code: response.error?.code,
                error_description: response.error?.description,
              });
            } catch (err) {
              console.error("Failed to update subscription status:", err);
            }
          }
          
          options.onFailure?.(response.error);
          setLoading(false);
        });
        razorpay.open();
      } catch (error: any) {
        console.error("Subscription initiation error:", error);
        toast.error(error.message || "Failed to initiate subscription");
        options.onFailure?.(error);
      } finally {
        setLoading(false);
      }
    },
    [loadRazorpayScript]
  );

  return {
    loading,
    initiatePayment,
    initiateSubscription,
  };
}
