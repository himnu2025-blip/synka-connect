import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, KeyRound, Mail, User, AlertTriangle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
export default function ProfileSettings() {
  const navigate = useNavigate();
  const { profile, updateProfile, loading, refetch: refetchProfile } = useProfile();
  const { user, verifyPin, setPin } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Change PIN dialog state
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinStep, setPinStep] = useState<'old' | 'new' | 'confirm'>('old');
  
  // Cancel subscription state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<{
    id: string;
    plan_type: string;
    end_date: string;
    auto_renew: boolean;
    cancelled_at: string | null;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
  }, [profile]);

  // Load active subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.id) return;
      
      setSubscriptionLoading(true);
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, plan_type, end_date, auto_renew, cancelled_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        setActiveSubscription(data);
      }
      setSubscriptionLoading(false);
    };
    
    fetchSubscription();
  }, [user?.id]);
  const handleSaveName = async () => {
    if (!fullName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your full name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    const { error } = await updateProfile({ full_name: fullName.trim() });
    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update name.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'Your name has been updated.',
      });
    }
  };

  const handleOpenChangePin = () => {
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinStep('old');
    setIsChangePinOpen(true);
  };
  const handleVerifyOldPin = async () => {
    if (oldPin.length !== 4) return;

    setIsChangingPin(true);
    const email = profile?.email || user?.email;
    
    if (!email) {
      setIsChangingPin(false);
      toast({
        title: 'Error',
        description: 'Could not find your email.',
        variant: 'destructive',
      });
      return;
    }

    const { error, locked } = await verifyPin(email, oldPin);
    setIsChangingPin(false);

    if (error) {
      if (locked) {
        toast({
          title: 'Account Locked',
          description: error.message,
          variant: 'destructive',
        });
        setIsChangePinOpen(false);
      } else {
        toast({
          title: 'Invalid PIN',
          description: error.message,
          variant: 'destructive',
        });
        setOldPin('');
      }
      return;
    }

    // Old PIN verified, move to new PIN step
    setPinStep('new');
  };

  const handleSetNewPin = async () => {
    if (newPin.length !== 4) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 4 digits.',
        variant: 'destructive',
      });
      return;
    }

    if (confirmPin.length !== 4) {
      toast({
        title: 'Confirm PIN',
        description: 'Please confirm your new PIN.',
        variant: 'destructive',
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: 'PINs do not match',
        description: 'Please make sure both PINs are the same.',
        variant: 'destructive',
      });
      setConfirmPin('');
      setPinStep('confirm');
      return;
    }

    setIsChangingPin(true);
    
    const userId = user?.id;
    if (!userId) {
      setIsChangingPin(false);
      toast({
        title: 'Error',
        description: 'Could not find your user ID.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await setPin(userId, newPin);
    setIsChangingPin(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to change PIN. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'PIN Changed',
      description: 'Your PIN has been updated successfully.',
    });
    setIsChangePinOpen(false);
  };

  const handlePinStepAction = () => {
    if (pinStep === 'old') {
      handleVerifyOldPin();
    } else if (pinStep === 'new') {
      if (newPin.length === 4) {
        setPinStep('confirm');
      }
    } else if (pinStep === 'confirm') {
      handleSetNewPin();
    }
  };

  const getPinStepTitle = () => {
    switch (pinStep) {
      case 'old': return 'Enter Current PIN';
      case 'new': return 'Enter New PIN';
      case 'confirm': return 'Confirm New PIN';
    }
  };

  const getPinStepValue = () => {
    switch (pinStep) {
      case 'old': return oldPin;
      case 'new': return newPin;
      case 'confirm': return confirmPin;
    }
  };

  const setPinStepValue = (value: string) => {
    switch (pinStep) {
      case 'old': setOldPin(value); break;
      case 'new': setNewPin(value); break;
      case 'confirm': setConfirmPin(value); break;
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSubscription) return;
    
    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'Please log in again.',
          variant: 'destructive',
        });
        return;
      }

      const response = await supabase.functions.invoke('cancel-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to cancel subscription');
      }

      const result = response.data;
      
      if (result.success) {
        toast({
          title: 'Subscription Cancelled',
          description: result.message,
        });
        
        // Update local state
        setActiveSubscription(prev => prev ? { ...prev, auto_renew: false, cancelled_at: new Date().toISOString() } : null);
        setIsCancelDialogOpen(false);
      } else {
        throw new Error(result.error || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatEndDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isOrangePlan = profile?.plan?.toLowerCase() === 'orange';

  if (loading) {
    return (
      <div className="w-full py-4 sm:py-6 px-3 sm:px-4 md:px-6 flex items-center justify-center min-h-[60vh] max-w-2xl mx-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="w-full py-4 sm:py-6 px-3 sm:px-4 md:px-6 space-y-4 sm:space-y-6 animate-fade-up max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <BrandLogo size="sm" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account details</p>
      </div>

      {/* Full Name */}
      <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Full Name</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Your display name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">
            This name is shown on the login screen and settings
          </p>
        </div>
        <Button
          onClick={handleSaveName}
          disabled={isSaving || fullName === profile?.full_name}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Save Name'}
          <Save className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Email (Read-only) */}
      <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Email</h2>
        </div>
        <div className="space-y-2">
          <Label>Your login email</Label>
          <Input
            value={profile?.email || user?.email || ''}
            disabled
            className="h-12 bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed as it's used for login
          </p>
        </div>
      </div>

      {/* Change PIN */}
      <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Change your 4-digit PIN for secure login
        </p>
        <Button
          variant="outline"
          onClick={handleOpenChangePin}
          className="w-full"
        >
          Change PIN
          <KeyRound className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Cancel Subscription - Only show for Orange plan users */}
      {isOrangePlan && (
        <div className="p-6 rounded-2xl bg-card border border-destructive/30 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-5 w-5 text-[#F26B4F]" />
            <h2 className="text-lg font-semibold text-foreground">Orange Plan</h2>
          </div>
          
          {subscriptionLoading ? (
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          ) : activeSubscription ? (
            <>
              {activeSubscription.cancelled_at ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your subscription has been cancelled. You will continue to have access to premium features until <span className="font-semibold text-foreground">{formatEndDate(activeSubscription.end_date)}</span>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    After this date, your account will be downgraded to the Free plan.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Your {activeSubscription.plan_type} subscription {activeSubscription.auto_renew ? 'renews' : 'is active until'} on <span className="font-semibold text-foreground">{formatEndDate(activeSubscription.end_date)}</span>.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    Cancel Subscription
                    <AlertTriangle className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You're on the Orange plan. No active subscription found.
            </p>
          )}
        </div>
      )}

      {/* Biometric settings moved to Settings page under App Lock */}

      {/* Change PIN Dialog */}
      <Dialog open={isChangePinOpen} onOpenChange={setIsChangePinOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{getPinStepTitle()}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={getPinStepValue()}
                onChange={setPinStepValue}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {pinStep === 'new' && (
              <p className="text-xs text-center text-muted-foreground">
                Choose a 4-digit PIN you'll remember
              </p>
            )}

            {pinStep === 'confirm' && (
              <p className="text-xs text-center text-muted-foreground">
                Re-enter your new PIN to confirm
              </p>
            )}

            <div className="flex gap-3">
              {pinStep !== 'old' && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (pinStep === 'new') {
                      setPinStep('old');
                      setNewPin('');
                    } else if (pinStep === 'confirm') {
                      setPinStep('new');
                      setConfirmPin('');
                    }
                  }}
                  disabled={isChangingPin}
                >
                  Back
                </Button>
              )}
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handlePinStepAction}
                disabled={isChangingPin || getPinStepValue().length !== 4}
              >
                {isChangingPin ? 'Please wait...' : pinStep === 'confirm' ? 'Change PIN' : 'Continue'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Orange Plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to cancel your Orange subscription? You will lose access to premium features including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Unlimited digital cards</li>
                <li>Premium card layouts</li>
                <li>Advanced CRM features</li>
                <li>Priority support</li>
              </ul>
              {activeSubscription && (
                <p className="font-medium text-foreground pt-2">
                  Your plan will remain active until {formatEndDate(activeSubscription.end_date)}.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelSubscription();
              }}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
