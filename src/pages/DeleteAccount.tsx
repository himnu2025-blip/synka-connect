import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DeleteAccount() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  
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

  const handleSubmitRequest = async () => {
    if (!user) {
      toast.error("Please login to submit a deletion request");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("deletion_requests")
        .insert({
          user_id: user.id,
          user_email: user.email,
          user_name: profile?.full_name || "",
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

  if (!user) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Account Deletion</CardTitle>
            <CardDescription>
              Please login to request account deletion
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/login")}>
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                Your account and all associated data will be permanently deleted within <span className="font-semibold text-foreground">7 days</span>.
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
              onClick={() => navigate("/dashboard")}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

        {/* Warning Card */}
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

        {/* Reason Form */}
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

        {/* Submit Button */}
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => setShowWarning(true)}
        >
          Request Account Deletion
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Your account will be scheduled for deletion and permanently removed after 7 days.
        </p>
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
                Are you sure you want to delete your account? This action cannot be undone after 7 days.
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
