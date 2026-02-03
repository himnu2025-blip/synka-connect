import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Check, X, Clock, ArrowLeft, Loader2, XCircle, RefreshCw, PartyPopper, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useRazorpay } from "@/hooks/useRazorpay";

const freeFeatures = [
  { text: "1 Digital Business Card", included: true },
  { text: "Standard QR Code", included: true },
  { text: "Share Digital Card via link", included: true },
  { text: "Save up to 100 Contacts", included: true },
  { text: "Manual Follow-ups", included: true },
  { text: "Basic Analytics (Views & Clicks)", included: true },
  { text: "Basic Contact Save", included: true },
  { text: "Multiple Digital Cards", included: false },
  { text: "Custom Domain", included: false },
  { text: "Email Signature", included: false },
  { text: "WhatsApp / Email Templates", included: false },
  { text: "Event Scheduling", included: false },
  { text: "Import & Export", included: false },
  { text: "NFC Writing", included: false },
  { text: "Advanced Reports", included: false },
];

const orangeFeatures = {
  core: {
    title: "Core Features",
    items: [
      { text: "Multiple Digital Business Cards", included: true },
      { text: 'One-Click "Make Default" Card', included: true },
      { text: "Unified Sharing & QR", included: true, sub: "Same QR & link always point to default card" },
      { text: "Custom Domain", included: true },
      { text: "Lifetime Free PVC NFC Card*", included: true },
    ],
  },
  communication: {
    title: "Communication & Growth",
    items: [
      { text: "Email Signature", included: true, sub: "Create using AI • Unlimited generations" },
      { text: "Prefilled WhatsApp & Email Templates", included: true, sub: "One-click touchbase" },
      { text: "Unlimited Contacts", included: true },
      { text: "Unlimited Follow-ups", included: true },
      { text: "Import & Export Contacts", included: true },
    ],
  },
  automation: {
    title: "Automation & Intelligence",
    items: [
      { text: "Event Scheduling & Auto Tagging", included: true },
      { text: "Advanced Analytics & Reports", included: true },
      { text: "Follow-up Automation", comingSoon: true },
      { text: "AI Auto Meeting Scheduling", comingSoon: true },
      { text: "Record Meetings & Get Instant MOM", comingSoon: true, sub: "Email / WhatsApp delivery" },
      { text: "Auto Smart Location Tagging", comingSoon: true },
    ],
  },
};

type OrangeOrderStatus = "none" | "requested" | "approved" | "rejected";

const Upgrade = () => {
  const { profile, loading, refetch } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateSubscription, initiateResume, loading: paymentLoading } = useRazorpay();
  const [orangeOrderStatus, setOrangeOrderStatus] = useState<OrangeOrderStatus>("none");
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAnnually, setIsAnnually] = useState(true);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [failedError, setFailedError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const hasFetchedRef = useRef(false);

  // ── resume state ──────────────────────────────────────────────────
  // true when the user has an active Orange plan but the e-mandate /
  // auto-renew has been cancelled (cancelled_at is set).  The paid
  // period is still running so the plan stays Orange, but we want to
  // show "Resume Subscription" instead of "Current Plan".
  const [needsResume, setNeedsResume] = useState(false);
  const [resumePlanType, setResumePlanType] = useState<"monthly" | "annually">("annually");

  const userPlan = profile?.plan?.toLowerCase() || "free";
  const isOrange = userPlan === "orange";

  // Pricing configuration
  const pricing = {
    annually: {
      displayPrice: "166.58",
      totalPrice: 1999,
      originalPrice: 3999,
      period: "month",
      billingNote: "₹1,999/year",
    },
    monthly: {
      displayPrice: "299",
      totalPrice: 299,
      originalPrice: 599,
      period: "month",
      billingNote: null,
    },
  };

  const currentPricing = isAnnually ? pricing.annually : pricing.monthly;

  // Fetch existing orange upgrade order status - only once
  useEffect(() => {
    if (!user || hasFetchedRef.current) {
      if (!user) setLoadingOrder(false);
      return;
    }

    const fetchStatus = async () => {
      hasFetchedRef.current = true;
      
      const { data, error } = await supabase
        .from("orders")
        .select("status")
        .eq("user_id", user.id)
        .eq("product_type", "orange_upgrade")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching orange order:", error);
        setOrangeOrderStatus("none");
      } else if (data) {
        const status = data.status?.toLowerCase();
        if (status === "requested") {
          setOrangeOrderStatus("requested");
        } else if (status === "approved") {
          setOrangeOrderStatus("approved");
        } else {
          setOrangeOrderStatus("none");
        }
      } else {
        setOrangeOrderStatus("none");
      }

      // ── Check for a resumable subscription ──────────────────────
      // A subscription is "resumable" when:
      //   status = active          (plan not downgraded yet)
      //   cancelled_at IS NOT NULL (mandate / auto-renew was cancelled)
      //   end_date >= now          (paid period hasn't expired)
      const { data: resumableSub } = await supabase
        .from("subscriptions")
        .select("plan_type, end_date, cancelled_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .not("cancelled_at", "is", null)
        .gte("end_date", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resumableSub) {
        setNeedsResume(true);
        setResumePlanType(resumableSub.plan_type as "monthly" | "annually");
      }

      setLoadingOrder(false);
    };

    fetchStatus();
  }, [user]);

  // Subscribe to realtime changes for this user's orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("upgrade-order-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).product_type === "orange_upgrade") {
            const status = ((payload.new as any).status || "").toLowerCase();
            if (status === "approved") {
              setOrangeOrderStatus("approved");
              refetch();
            } else if (status === "rejected") {
              setOrangeOrderStatus("none");
            } else if (status === "requested") {
              setOrangeOrderStatus("requested");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const handleUpgradeRequest = async () => {
    if (!user) {
      toast.error("Please log in to upgrade");
      return;
    }

    setSubmitting(true);
    setPaymentFailed(false);
    setFailedError(null);
    
    // Use Razorpay for payment
    const planType = isAnnually ? "annually" : "monthly";
    
    initiateSubscription({
      plan_type: planType,
      onSuccess: (response) => {
        setOrangeOrderStatus("approved");
        setPaymentSuccess(true);
        refetch();
        setSubmitting(false);
      },
      onFailure: (error) => {
        console.error("Payment failed:", error);
        setPaymentFailed(true);
        setFailedError(error?.message || "Payment could not be processed. Please try again.");
        setSubmitting(false);
      },
    });
  };

  const handleRetryPayment = () => {
    setPaymentFailed(false);
    setFailedError(null);
  };

  // ── Resume a cancelled mandate while the paid period is still active ─
  const handleResumeSubscription = () => {
    if (!user) {
      toast.error("Please log in to resume");
      return;
    }

    setSubmitting(true);
    setPaymentFailed(false);
    setFailedError(null);

    initiateResume({
      plan_type: resumePlanType,
      onSuccess: () => {
        setNeedsResume(false);   // Clear the resume state immediately
        setPaymentSuccess(true);
        refetch();               // Refetch profile for latest plan info
        setSubmitting(false);
      },
      onFailure: (error) => {
        console.error("Resume payment failed:", error);
        setPaymentFailed(true);
        setFailedError(error?.message || "Payment could not be processed. Please try again.");
        setSubmitting(false);
      },
    });
  };

  if (loading || loadingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-plan border-t-transparent rounded-full" />
      </div>
    );
  }

  // Payment Failed Screen
  if (paymentFailed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-2xl border border-destructive/20 p-8 text-center space-y-6 shadow-lg">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Payment Failed</h1>
              <p className="text-muted-foreground text-sm">
                {failedError || "Your payment could not be processed. Please try again."}
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
              <h3 className="font-semibold text-foreground text-sm">What you can do:</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-orange-500" />
                  Check your payment details and try again
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-orange-500" />
                  Ensure sufficient balance
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-orange-500" />
                  Try a different payment method
                </li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Need help? Contact us at{" "}
              <a href="mailto:orders@synka.in" className="text-orange-plan underline">
                orders@synka.in
              </a>
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                className="w-full bg-orange-plan hover:bg-orange-plan/90"
                onClick={handleRetryPayment}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/settings")}
              >
                Back to Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment Success Screen  
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-2xl border border-orange-plan/30 p-8 text-center space-y-6 shadow-lg">
            <div className="w-20 h-20 mx-auto rounded-full bg-orange-plan/10 flex items-center justify-center">
              <PartyPopper className="h-10 w-10 text-orange-plan" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">🎉 Welcome to Orange!</h1>
              <p className="text-muted-foreground text-sm">
                Your subscription is now active. Enjoy all premium features!
              </p>
            </div>

            <div className="bg-orange-plan/10 rounded-xl p-4 text-left space-y-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Crown className="h-4 w-4 text-orange-plan" />
                What's included:
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-orange-plan" />
                  Multiple Digital Business Cards
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-orange-plan" />
                  Lifetime Free PVC NFC Card
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-orange-plan" />
                  Email Signatures & Templates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-orange-plan" />
                  Advanced Analytics & More
                </li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Questions? Contact us at{" "}
              <a href="mailto:orders@synka.in" className="text-orange-plan underline">
                orders@synka.in
              </a>
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                className="w-full bg-orange-plan hover:bg-orange-plan/90"
                onClick={() => navigate("/my-card")}
              >
                Go to My Card
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getOrangeButtonState = () => {
    // ── mandate cancelled, paid period still running → offer resume ──
    if (isOrange && needsResume) {
      return { text: "Resume Subscription", disabled: false, variant: "default" as const, isResume: true };
    }
    if (isOrange) {
      return { text: "Current Plan", disabled: true, variant: "secondary" as const, isResume: false };
    }
    if (orangeOrderStatus === "requested") {
      return { text: "Requested", disabled: true, variant: "outline" as const, isResume: false };
    }
    return { text: "Upgrade to Orange", disabled: false, variant: "default" as const, isResume: false };
  };

  const orangeButton = getOrangeButtonState();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2">
            Unlock powerful features to grow your network
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* ORANGE Plan */}
          <div className="relative rounded-2xl border-2 border-orange-plan bg-card p-6 lg:p-8 shadow-lg shadow-orange-plan/10">
            {/* Orange Badge */}
            <div className="absolute -top-4 left-6 bg-orange-plan text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">
              ORANGE
            </div>

            <div className="mb-6 mt-2">
              <h2 className="text-2xl font-bold text-foreground">ORANGE</h2>
              
              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-3 mt-4 p-3 bg-muted/50 rounded-lg">
                <span className={`text-sm font-medium ${!isAnnually ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Monthly
                </span>
                <Switch
                  checked={isAnnually}
                  onCheckedChange={setIsAnnually}
                  className="data-[state=checked]:bg-orange-plan"
                />
                <span className={`text-sm font-medium ${isAnnually ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Annually
                </span>
                {isAnnually && (
                  <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full font-medium">
                    Save 50%
                  </span>
                )}
              </div>

              {/* Pricing Display */}
              <div className="mt-4 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-orange-plan">₹{currentPricing.displayPrice}</span>
                  <span className="text-muted-foreground">/{currentPricing.period}</span>
                </div>
                
                {isAnnually ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentPricing.billingNote}
                  </p>
                ) : null}

                {/* Limited Period Offer */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-muted-foreground line-through text-lg">
                    ₹{currentPricing.originalPrice}
                  </span>
                  <span className="text-xs bg-red-500/20 text-red-600 px-2 py-1 rounded-full font-semibold animate-pulse">
                    Limited Period Offer!
                  </span>
                </div>
              </div>
            </div>

            {/* Core Features */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-orange-plan mb-3">
                {orangeFeatures.core.title}
              </h3>
              <div className="space-y-2.5">
                {orangeFeatures.core.items.map((feature, idx) => (
                  <FeatureItem key={idx} feature={feature} />
                ))}
              </div>
            </div>

            {/* Communication Features */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-orange-plan mb-3">
                {orangeFeatures.communication.title}
              </h3>
              <div className="space-y-2.5">
                {orangeFeatures.communication.items.map((feature, idx) => (
                  <FeatureItem key={idx} feature={feature} />
                ))}
              </div>
            </div>

            {/* Automation Features */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-orange-plan mb-3">
                {orangeFeatures.automation.title}
              </h3>
              <div className="space-y-2.5">
                {orangeFeatures.automation.items.map((feature, idx) => (
                  <FeatureItem key={idx} feature={feature} />
                ))}
              </div>
            </div>

            {/* Payment Summary Box */}
            {!isOrange && orangeOrderStatus !== "requested" && (
              <div className="mb-4 p-4 bg-orange-plan/10 rounded-lg border border-orange-plan/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total to pay</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-orange-plan">₹{currentPricing.totalPrice}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {isAnnually ? "/year" : "/month"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {/* ── Info banner: only when mandate is cancelled but plan is active ── */}
              {needsResume && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-700">Auto-renewal cancelled</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Your Orange plan is still active until the end of the current period. Resume to re-enable auto-renewal and keep your plan going.
                    </p>
                  </div>
                </div>
              )}

              <Button
                className={
                  orangeButton.variant === "default"
                    ? "w-full bg-orange-plan hover:bg-orange-plan/90 text-white"
                    : "w-full"
                }
                variant={orangeButton.variant}
                disabled={orangeButton.disabled || submitting}
                onClick={orangeButton.disabled ? undefined : (orangeButton.isResume ? handleResumeSubscription : handleUpgradeRequest)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {orangeButton.isResume ? "Resuming..." : "Submitting..."}
                  </>
                ) : (
                  orangeButton.text
                )}
              </Button>
              {orangeOrderStatus === "requested" && (
                <p className="text-xs text-muted-foreground text-center">
                  Request under review
                </p>
              )}
            </div>
          </div>

          {/* FREE Plan */}
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">FREE</h2>
              <p className="text-muted-foreground mt-1">Get started with the basics</p>
            </div>

            <div className="space-y-3 mb-8">
              {freeFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {feature.included ? (
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                  )}
                  <span
                    className={
                      feature.included
                        ? "text-foreground"
                        : "text-muted-foreground/50 line-through"
                    }
                  >
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              variant={!isOrange && orangeOrderStatus !== "approved" ? "secondary" : "outline"}
              disabled={!isOrange && orangeOrderStatus !== "approved"}
            >
              {!isOrange && orangeOrderStatus !== "approved" ? "Current Plan" : "Free Plan"}
            </Button>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-xs text-muted-foreground mt-8 text-center">
          * Lifetime Free PVC NFC Card available with Orange plan activation. Terms apply.
        </p>
      </div>
    </div>
  );
};

interface FeatureItemProps {
  feature: {
    text: string;
    included?: boolean;
    comingSoon?: boolean;
    sub?: string;
  };
}

const FeatureItem = ({ feature }: FeatureItemProps) => {
  const isComingSoon = feature.comingSoon;

  return (
    <div className="flex items-start gap-3">
      {isComingSoon ? (
        <Clock className="w-4 h-4 text-muted-foreground/60 mt-0.5 flex-shrink-0" />
      ) : (
        <Check className="w-4 h-4 text-orange-plan mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <span
          className={
            isComingSoon
              ? "text-muted-foreground/60 text-sm"
              : "text-foreground text-sm"
          }
        >
          {feature.text}
          {isComingSoon && (
            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          )}
        </span>
        {feature.sub && (
          <p className={`text-xs mt-0.5 ${isComingSoon ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
            {feature.sub}
          </p>
        )}
      </div>
    </div>
  );
};

export default Upgrade;
