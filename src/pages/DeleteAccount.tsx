import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Mail, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DeleteAccount() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  
  // Form for non-logged in users
  const [guestName, setGuestName] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  
  const [reason, setReason] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");

  const benefits = [
    "All your digital business cards and QR codes",
    "Your CRM contacts and networking history",
    "Event analytics and scan statistics",
    "Email signatures and templates",
    "Orange plan subscription benefits (if applicable)",
    "NFC card programming data",
  ];

  const handleVerifyEmail = async () => {
    if (!guestEmail.trim()) {
      setEmailError("Please enter your email address");
      return;
    }

    setIsCheckingEmail(true);
    setEmailError("");

    try {
      // Check if email exists in profiles
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("email", guestEmail.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (!profileData) {
        setEmailError("This email is not registered with SYNKA™");
        setEmailVerified(false);
        setVerifiedUserId(null);
        return;
      }

      setVerifiedUserId(profileData.user_id);
      setEmailVerified(true);
      if (profileData.full_name && !guestName) {
        setGuestName(profileData.full_name);
      }
      toast.success("Email verified! You can now submit deletion request.");
    } catch (error: any) {
      console.error("Error verifying email:", error);
      setEmailError("Failed to verify email. Please try again.");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmitRequest = async () => {
    const userId = user?.id || verifiedUserId;
    const userEmail = user?.email || guestEmail.trim().toLowerCase();
    const userName = profile?.full_name || guestName;

    if (!userId) {
      toast.error("Please verify your email first");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("deletion_requests")
        .insert({
          user_id: userId,
          user_email: userEmail,
          user_name: userName || "",
          reason: reason || null,
        })
        .select("reference_number")
        .single();

      if (error) throw error;

      setReferenceNumber(data.reference_number);
      setSubmitted(true);
      setShowWarning(false);
    } catch (error: any) {
      console.error("Error submitting deletion request:", error);
      toast.error(error.message || "Failed to submit deletion request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state - same for both logged in and guest users
  if (submitted) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">We Will Miss You 💔</CardTitle>
            <CardDescription className="text-base">
              Your account deletion request has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Reference Number</p>
              <p className="text-lg font-mono font-semibold text-foreground">{referenceNumber}</p>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Your request is under review. Our team will process it within <span className="font-semibold text-foreground">7 days</span>.
              </p>
              <p className="text-sm text-muted-foreground">
                If you change your mind, please contact us before the deletion is processed.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <a href="mailto:support@synka.in" className="text-primary hover:underline">
                support@synka.in
              </a>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/")}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form - works for both logged in and guest users
  const isLoggedIn = !!user;
  const canSubmit = isLoggedIn || emailVerified;

  return (
    <div className="min-h-dvh bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Delete Your Account</h1>
          <p className="text-muted-foreground">
            We're sorry to see you go. Please review the information below before proceeding.
          </p>
        </div>

        {/* Guest User Form - Only show if not logged in */}
        {!isLoggedIn && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verify Your Identity</CardTitle>
              <CardDescription>
                Enter your registered email to proceed with deletion request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Full Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled={emailVerified}
                />
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Mobile Number"
                  value={guestMobile}
                  onChange={(e) => setGuestMobile(e.target.value)}
                  disabled={emailVerified}
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email Address *"
                  value={guestEmail}
                  onChange={(e) => {
                    setGuestEmail(e.target.value);
                    setEmailError("");
                    setEmailVerified(false);
                  }}
                  disabled={emailVerified}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
                {emailVerified && (
                  <p className="text-sm text-green-600">✓ Email verified</p>
                )}
              </div>
              
              {!emailVerified ? (
                <Button 
                  onClick={handleVerifyEmail}
                  disabled={isCheckingEmail || !guestEmail.trim()}
                  className="w-full"
                >
                  {isCheckingEmail ? "Verifying..." : "Verify Email"}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEmailVerified(false);
                    setVerifiedUserId(null);
                  }}
                  className="w-full"
                >
                  Change Email
                </Button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                variant="secondary"
                onClick={() => navigate("/login")}
                className="w-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login to Delete Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Logged in user info */}
        {isLoggedIn && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Logged in as</p>
                <p className="font-medium">{profile?.full_name || user?.email}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warning Card - Only show when can submit */}
        {canSubmit && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <CardTitle className="text-base text-destructive">What You'll Lose</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-destructive mt-1">•</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Reason Form - Only show when can submit */}
        {canSubmit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Help Us Improve</CardTitle>
              <CardDescription>
                Your feedback helps us make SYNKA™ better (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Please tell us why you're leaving..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>
        )}

        {/* Support Info */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Having issues? We'd love to help before you go.
              </p>
              <div className="flex items-center gap-2 justify-center">
                <Mail className="w-4 h-4 text-primary" />
                <a 
                  href="mailto:support@synka.in" 
                  className="text-primary font-medium hover:underline"
                >
                  support@synka.in
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button - Only show when can submit */}
        {canSubmit && (
          <>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => setShowWarning(true)}
            >
              Request Account Deletion
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your request will be reviewed and processed by our team within 7 days.
            </p>
          </>
        )}
      </div>

      {/* Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Account Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete your account? This action cannot be undone once approved.
              </p>
              <p className="font-medium text-foreground">
                You will permanently lose:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                {benefits.slice(0, 4).map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-destructive">•</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitRequest}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Submitting..." : "Yes, Delete My Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
