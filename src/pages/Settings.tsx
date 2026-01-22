import {
  User,
  CreditCard,
  PlayCircle,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Nfc,
  Lock,
  Fingerprint,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCards } from '@/hooks/useCards';
import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { isAppLockEnabled, setAppLockEnabled, clearCachedUser, getCachedUserName, getCachedUserEmail, setCachedUserName, setCachedUserEmail } from '@/lib/appLock';
import { checkBiometricAvailability, getBiometryTypeName, type BiometricResult } from '@/lib/biometrics';
import { checkNfcAvailability } from '@/lib/nativeNfc';

const settingsItems = [
  {
    id: 'profile',
    icon: User,
    label: 'Profile',
    description: 'View and edit your account',
    action: 'navigate',
  },
  {
    id: 'order-nfc',
    icon: CreditCard,
    label: 'Get your NFC Card',
    description: 'Order a physical smart card',
    action: 'navigate',
  },
  {
    id: 'upgrade',
    icon: CreditCard,
    label: 'Upgrade Plan',
    description: 'Access premium features',
    action: 'navigate',
  },
  {
    id: 'demo',
    icon: PlayCircle,
    label: 'Features Demo',
    description: 'How to use & FAQ',
    action: 'navigate',
  },
  {
    id: 'support',
    icon: HelpCircle,
    label: 'Support',
    description: 'Get help when you need it',
    action: 'navigate',
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { activeCard, loading: cardsLoading } = useCards();

  const [isNfcDialogOpen, setIsNfcDialogOpen] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [isWritingNfc, setIsWritingNfc] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  
  // App Lock state
  const [appLockOn, setAppLockOn] = useState(isAppLockEnabled());
  const [biometricInfo, setBiometricInfo] = useState<BiometricResult | null>(null);
  const [biometricOn, setBiometricOn] = useState(localStorage.getItem('synka_biometric_enabled') === 'true');

  // ✅ FIX: Track animation state to prevent replay on resume
  const didAnimateRef = useRef(true);
  
  // Check if user is on Orange plan
  const isOrangePlan = profile?.plan?.toLowerCase() === 'orange';
  
  // Offline fields (no slug input; slug is taken from profile.public_slug)
  const [offlineName, setOfflineName] = useState('');
  const [offlineCompany, setOfflineCompany] = useState('');
  const [offlineDesignation, setOfflineDesignation] = useState('');
  const [offlinePhone, setOfflinePhone] = useState('');
  const [offlineEmail, setOfflineEmail] = useState('');

  useEffect(() => {
    // Check NFC availability using native module
    const nfcStatus = checkNfcAvailability();
    setNfcSupported(nfcStatus.isSupported);
    
    // Check biometric availability
    if (Capacitor.isNativePlatform()) {
      checkBiometricAvailability().then(setBiometricInfo);
    }
  }, []);

  // Auto-fill offline fields when dialog opens
  useEffect(() => {
    if (isNfcDialogOpen) {
      setOfflineName(activeCard?.full_name || '');
      setOfflineCompany(activeCard?.company || '');
      setOfflineDesignation(activeCard?.designation || '');
      setOfflinePhone(activeCard?.phone || activeCard?.whatsapp || '');
      setOfflineEmail(activeCard?.email || '');
    }
  }, [isNfcDialogOpen, activeCard]);

  const handleLogout = async () => {
    await signOut(); // Supabase session cleared only

    toast({
      title: 'Logged out',
      description: 'See you next time!',
    });

    navigate('/login', { replace: true });
  };
  
  const handleAppLockToggle = () => {
    const newValue = !appLockOn;
    setAppLockOn(newValue);
    setAppLockEnabled(newValue);
    
    // If turning off app lock, also disable biometric
    if (!newValue && biometricOn) {
      setBiometricOn(false);
      localStorage.setItem('synka_biometric_enabled', 'false');
    }
    
    toast({
      title: newValue ? 'App Lock enabled' : 'App Lock disabled',
      description: newValue 
        ? 'You will need to unlock the app when you open it.' 
        : 'App will open directly without unlock.',
    });
  };
  
  const handleBiometricToggle = () => {
    if (!appLockOn) return; // Can't enable biometric if app lock is off
    
    const newValue = !biometricOn;
    setBiometricOn(newValue);
    localStorage.setItem('synka_biometric_enabled', String(newValue));
    
    toast({
      title: newValue ? 'Biometric enabled' : 'Biometric disabled',
      description: newValue 
        ? 'Use biometrics to unlock the app.' 
        : 'PIN will be required to unlock.',
    });
  };

  const handleItemClick = (id: string) => {
    switch (id) {
      case 'profile':
        navigate('/settings/profile');
        break;
      case 'order-nfc':
        navigate('/order-nfc-card');
        break;
      case 'upgrade':
        navigate('/settings/upgrade');
        break;
      case 'demo':
        navigate('/support');
        break;
      case 'support':
        navigate('/contact');
        break;
    }
  };

  const writeToNfc = async () => {
    // Must have slug in profile — we will write URL + vCard for offline data
    const publicSlug = profile?.slug;
    if (!publicSlug) {
      toast({
        title: 'Public view missing',
        description: 'Please set your public view slug in your profile before writing NFC.',
        variant: 'destructive',
      });
      return;
    }

    const origin = window.location.origin;
    const publicUrl = `${origin}/u/${publicSlug}`;

    // Generate vCard string for offline contact data
    const generateVCard = () => {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
      ];
      
      if (offlineName) {
        lines.push(`FN:${offlineName}`);
        // Split name for N field (Last;First format)
        const nameParts = offlineName.trim().split(' ');
        const lastName = nameParts.length > 1 ? nameParts.pop() : '';
        const firstName = nameParts.join(' ');
        lines.push(`N:${lastName};${firstName};;;`);
      }
      
      if (offlineCompany) {
        lines.push(`ORG:${offlineCompany}`);
      }
      
      if (offlineDesignation) {
        lines.push(`TITLE:${offlineDesignation}`);
      }
      
      if (offlinePhone) {
        lines.push(`TEL;TYPE=CELL:${offlinePhone}`);
      }
      
      if (offlineEmail) {
        lines.push(`EMAIL:${offlineEmail}`);
      }
      
      // Add Synka profile URL
      lines.push(`URL:${publicUrl}`);
      
      lines.push('END:VCARD');
      return lines.join('\r\n');
    };

    if (!('NDEFReader' in window)) {
      toast({
        title: 'NFC not supported',
        description: 'Your device or browser does not support NFC writing.',
        variant: 'destructive',
      });
      return;
    }

    setIsWritingNfc(true);
    try {
      // @ts-ignore NDEFReader may not be in types
      const ndef = new NDEFReader();

      // Create vCard string
      const vCardData = generateVCard();
      const encoder = new TextEncoder();
      const vCardPayload = encoder.encode(vCardData);

      // Write both URL (for online) and vCard (for offline contact save)
      await ndef.write({
        records: [
          // URL record - opens Synka profile when online
          { recordType: 'url', data: publicUrl },
          // vCard MIME record - allows saving contact when offline
          {
            recordType: 'mime',
            mediaType: 'text/vcard',
            data: vCardPayload,
          },
        ],
      });

      toast({
        title: 'NFC written successfully',
        description: 'Profile URL and contact card saved to NFC tag.',
      });
      setIsNfcDialogOpen(false);
    } catch (err: any) {
      console.error('NFC write error:', err);
      toast({
        title: 'NFC write failed',
        description: err?.message || 'Make sure NFC is enabled and hold the tag close.',
        variant: 'destructive',
      });
    } finally {
      setIsWritingNfc(false);
    }
  };

  // Get display name - use cached name for instant display, then profile
  const isDataLoading = profileLoading || cardsLoading;
  const cachedName = getCachedUserName();
  const cachedEmail = getCachedUserEmail();
  const profileDisplayName =
  profile?.full_name ||
  activeCard?.full_name ||
  cachedName ||
  '';
  
  // Update cache when profile loads
  useEffect(() => {
    if (profile?.full_name) {
      setCachedUserName(profile.full_name);
    } else if (activeCard?.full_name) {
      setCachedUserName(activeCard.full_name);
    }

    if (profile?.email) {
      setCachedUserEmail(profile.email);
    } else if (activeCard?.email) {
      setCachedUserEmail(activeCard.email);
    }
  }, [profile?.full_name, profile?.email, activeCard?.full_name, activeCard?.email]);
  
  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div
      className={cn(
        "w-full py-4 sm:py-6 px-3 sm:px-4 md:px-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto",
        // ✅ FIX: Only animate on first mount, not on resume
        !didAnimateRef.current && "animate-fade-up"
      )}
    >
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Card - Shows only Full Name (linked to profile, not card) */}
      <button
        onClick={() => navigate('/settings/profile')}
        className="w-full p-6 rounded-2xl bg-card border border-border/50 card-hover text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden bg-muted">
            {/* SIMPLIFIED: Let browser handle image loading naturally */}
            {activeCard?.photo_url ? (
              <img
                src={activeCard.photo_url}
                alt={profileDisplayName}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${activeCard?.face_x ?? 50}% ${activeCard?.face_y ?? 38}%`
                }}
              />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {getInitials(profileDisplayName) || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isDataLoading && !cachedName ? (
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <h2 className="text-lg font-semibold text-foreground truncate">
                Hi {profileDisplayName || 'there'}
              </h2>
            )}
            {profile?.plan === 'Orange' && (
              <span
                className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: '#F26B4F' }}
              >
                Orange
              </span>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>

      {/* Theme Toggle */}
      <div className="p-4 rounded-2xl bg-card border border-border/50">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              {theme === 'light' ? (
                <Sun className="h-5 w-5 text-amber-500" />
              ) : (
                <Moon className="h-5 w-5 text-violet-500" />
              )}
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Appearance</p>
              <p className="text-sm text-muted-foreground">
                {theme === 'light' ? 'Light mode' : 'Dark mode'}
              </p>
            </div>
          </div>
          <div className={cn(
            "w-12 h-7 rounded-full p-1 transition-colors",
            theme === 'dark' ? 'bg-primary' : 'bg-muted'
          )}>
            <div className={cn(
              "w-5 h-5 rounded-full bg-background shadow-sm transition-transform",
              theme === 'dark' && 'translate-x-5'
            )} />
          </div>
        </button>
      </div>

      {/* Settings List */}
      <div className="space-y-2">
        {settingsItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={cn(
              "w-full p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-4 card-hover text-left"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <item.icon className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* App Lock Toggle - Only show on native platforms */}
      {Capacitor.isNativePlatform() && (
        <div className="p-4 rounded-2xl bg-card border border-border/50">
          <button
            onClick={handleAppLockToggle}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Lock className="h-5 w-5 text-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">App Lock</p>
                <p className="text-sm text-muted-foreground">
                  {appLockOn 
                    ? (biometricOn ? 'Biometric or PIN on open' : 'PIN required on open')
                    : 'Opens directly'}
                </p>
              </div>
            </div>
            <div className={cn(
              "w-12 h-7 rounded-full p-1 transition-colors",
              appLockOn ? 'bg-primary' : 'bg-muted'
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full bg-background shadow-sm transition-transform",
                appLockOn && 'translate-x-5'
              )} />
            </div>
          </button>
        </div>
      )}

      {/* Biometric Toggle - Only show if biometric is available, below App Lock */}
      {Capacitor.isNativePlatform() && biometricInfo?.available && (
        <div className={cn(
          "p-4 rounded-2xl bg-card border border-border/50 -mt-2",
          !appLockOn && "opacity-50"
        )}>
          <button
            onClick={handleBiometricToggle}
            disabled={!appLockOn}
            className="flex items-center justify-between w-full disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Fingerprint className={cn("h-5 w-5", appLockOn ? "text-foreground" : "text-muted-foreground")} />
              </div>
              <div className="text-left">
                <p className={cn("font-medium", appLockOn ? "text-foreground" : "text-muted-foreground")}>
                  Biometric Unlock
                </p>
                <p className="text-sm text-muted-foreground">
                  {!appLockOn 
                    ? 'Enable App Lock first' 
                    : `Use ${getBiometryTypeName(biometricInfo.biometryType)} to unlock`}
                </p>
              </div>
            </div>
            <div className={cn(
              "w-12 h-7 rounded-full p-1 transition-colors",
              biometricOn && appLockOn ? 'bg-primary' : 'bg-muted'
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full bg-background shadow-sm transition-transform",
                biometricOn && appLockOn && 'translate-x-5'
              )} />
            </div>
          </button>
        </div>
      )}

      {/* NFC Writer Card (moved here, above Logout) */}
      <div className="p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-4 card-hover">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center relative">
          <Nfc className="h-5 w-5 text-foreground" />
          {!isOrangePlan && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
              <Lock className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">NFC Writer</p>
          <p className="text-sm text-muted-foreground">Write your public view slug & offline data to NFC tags</p>
        </div>
        <div>
          <Button 
            variant="ghost" 
            onClick={() => {
              if (isOrangePlan) {
                setIsNfcDialogOpen(true);
              } else {
                setShowUpgradePopup(true);
              }
            }}
          >
            {isOrangePlan ? 'Open' : (
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Open
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Upgrade Popup for Free Users */}
      <Dialog open={showUpgradePopup} onOpenChange={setShowUpgradePopup}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-orange-500" />
              </div>
              <span>Orange Feature</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground">
              NFC Writing is a premium feature available exclusively for Orange plan users. Upgrade now to unlock this and many other powerful features!
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowUpgradePopup(false)}>
                Maybe Later
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => {
                  setShowUpgradePopup(false);
                  navigate('/settings/upgrade');
                }}
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-4 hover:bg-destructive/20 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <LogOut className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-destructive">Logout</p>
          <p className="text-sm text-destructive/70">Sign out of your account</p>
        </div>
      </button>

      {/* Version */}
      <p className="text-center text-sm text-muted-foreground pt-6">
        Synka v1.0.0
      </p>

      {/* NFC Writer Dialog - NO slug shown, no site preview shown */}
      <Dialog open={isNfcDialogOpen} onOpenChange={setIsNfcDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>NFC Writer - Confirm & Edit</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!nfcSupported && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {Capacitor.isNativePlatform() 
                    ? 'NFC writing requires Chrome browser on Android. Please open synka.in in Chrome to write NFC tags.'
                    : 'NFC is not supported on this device/browser. Please use Chrome on Android.'}
                </p>
              </div>
            )}

            {/* Offline fields only — slug is taken automatically (hidden) */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={offlineName} onChange={(e) => setOfflineName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={offlineCompany} onChange={(e) => setOfflineCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={offlineDesignation} onChange={(e) => setOfflineDesignation(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={offlinePhone} onChange={(e) => setOfflinePhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={offlineEmail} onChange={(e) => setOfflineEmail(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsNfcDialogOpen(false)} disabled={isWritingNfc}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={writeToNfc}
                disabled={!nfcSupported || isWritingNfc}
              >
                {isWritingNfc ? 'Waiting for tag...' : 'Write to NFC'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
