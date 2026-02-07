// Authentication context provider - PIN + OTP based authentication
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // OTP methods
  sendOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  // PIN methods
  setPin: (userId: string, pin: string) => Promise<{ error: Error | null }>;
  verifyPin: (email: string, pin: string) => Promise<{ error: Error | null; user_id?: string; locked?: boolean; needs_pin_setup?: boolean }>;
  checkPinExists: (email: string) => Promise<{ exists: boolean; has_pin: boolean; user_id?: string; full_name?: string | null }>;
  // Direct login after PIN verification (for known devices)
  loginWithPinOnly: (email: string, userId: string) => Promise<{ error: Error | null }>;
  // Social login
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithLinkedIn: () => Promise<{ error: Error | null }>;
  // Sign out
  signOut: () => Promise<void>;
  // Create session after PIN verification
  createSessionWithOtp: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------------- */
  /* ENSURE PROFILE + DEFAULT CARD EXISTS (CORE LOGIC) */
  /* ---------------------------------------------------- */

  const ensureProfileAndCard = async (user: User) => {
    const name = user.user_metadata?.name || user.user_metadata?.full_name || '';
    const phone = user.user_metadata?.phone || '';
    const email = user.email || '';

    /* 1️⃣ Check profile */
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, slug')
      .eq('user_id', user.id)
      .maybeSingle();

    /* 2️⃣ Create profile if missing */
    if (!profile) {
      const emailPrefix =
        email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const slug = `${emailPrefix}-${user.id.slice(0, 6)}`;

      await supabase.from('profiles').insert({
        user_id: user.id,
        email,
        slug,
        full_name: name,
        phone,
      });
    }

    /* 3️⃣ Check default card */
    const { data: card } = await supabase
      .from('cards')
      .select('id, name, full_name, email, phone')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle();

    /* 4️⃣ Create or update default card with signup data */
    if (!card) {
      await supabase.from('cards').insert({
        user_id: user.id,
        name: 'My Card',
        is_default: true,
        layout: 'dark-professional',
        full_name: name,
        email,
        phone,
        whatsapp: phone,
      });
    } else {
      const isPersonal = (card.name ?? '').trim().toLowerCase() === 'personal';

      // Update card if it has empty fields or uses legacy "Personal" name
      const needsUpdate =
        isPersonal ||
        (!card.full_name && name) ||
        (!card.email && email) ||
        (!card.phone && phone);

      if (needsUpdate) {
        await supabase
          .from('cards')
          .update({
            name: isPersonal ? 'My Card' : (card.name || 'My Card'),
            full_name: card.full_name || name,
            email: card.email || email,
            phone: card.phone || phone,
            whatsapp: (card.phone || phone) || null,
          })
          .eq('id', card.id);
      }
    }

    // Force DB consistency - wait for default card to be confirmed
    await supabase
      .from('cards')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();
  };

  /* ---------------- AUTH LISTENER ---------------- */

  useEffect(() => {
    // Check if we should clear session (web only, remember me was off)
    const checkSessionClear = async () => {
      if (!Capacitor.isNativePlatform()) {
        const wasTemp = sessionStorage.getItem('synka_session_temp');
        const rememberMe = localStorage.getItem('synka_remember_me');
        
        // If last session was temp (remember me off) and browser was closed/reopened
        // We detect this by checking if session temp flag exists
        if (wasTemp === 'true' && rememberMe === 'false') {
          // Clear the session on new browser session
          await supabase.auth.signOut();
          sessionStorage.removeItem('synka_session_temp');
          setLoading(false);
          return true;
        }
        sessionStorage.removeItem('synka_session_temp');
      }
      return false;
    };

    const initAuth = async () => {
      const shouldClear = await checkSessionClear();
      if (shouldClear) return;

      // Set up auth state listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => ensureProfileAndCard(session.user), 0);
        }
      });

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => ensureProfileAndCard(session.user), 0);
        }
      });

      return () => subscription.unsubscribe();
    };

    const cleanup = initAuth();
    return () => {
      cleanup.then((unsub) => unsub?.());
    };
  }, []);

  /* ---------------- SEND OTP ---------------- */

  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { shouldCreateUser: true },
    });
    return { error };
  };

  /* ---------------- VERIFY OTP ---------------- */

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token,
      type: 'email',
    });
    return { error };
  };

  /* ---------------- CREATE SESSION WITH OTP (for PIN login) ---------------- */

  const createSessionWithOtp = async (email: string) => {
    // This sends a magic link/OTP that auto-logs in the user
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { shouldCreateUser: false },
    });
    return { error };
  };

  /* ---------------- PIN METHODS ---------------- */

  const setPin = async (userId: string, pin: string) => {
    try {
      const response = await supabase.functions.invoke('pin-auth', {
        body: { action: 'SET_PIN', user_id: userId, pin },
      });

      if (response.error) {
        return { error: new Error(response.error.message || 'Failed to set PIN') };
      }

      if (response.data?.error) {
        return { error: new Error(response.data.error) };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const verifyPin = async (email: string, pin: string) => {
    try {
      const response = await supabase.functions.invoke('pin-auth', {
        body: { action: 'VERIFY_PIN', email, pin },
      });

      // Transport / invoke layer errors (network, 5xx, etc.)
      if (response.error) {
        // Backward compat: older versions returned non-2xx and placed body in context
        const errorContext = response.error.context;
        if (errorContext) {
          try {
            const errorBody = await errorContext.json();
            return {
              error: new Error(errorBody.error || 'Failed to verify PIN'),
              locked: errorBody.locked,
              needs_pin_setup: errorBody.needs_pin_setup,
              attempts_left: errorBody.attempts_left,
            };
          } catch {
            // ignore parsing errors
          }
        }

        return { error: new Error(response.error.message || 'Failed to verify PIN') };
      }

      // New behavior: edge function returns 200 with success=false for invalid PIN / lockout
      if (!response.data?.success) {
        return {
          error: new Error(response.data?.error || 'Failed to verify PIN'),
          locked: response.data?.locked,
          needs_pin_setup: response.data?.needs_pin_setup,
          attempts_left: response.data?.attempts_left,
        };
      }

      return { error: null, user_id: response.data.user_id };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const checkPinExists = async (email: string) => {
    try {
      const response = await supabase.functions.invoke('pin-auth', {
        body: { action: 'CHECK_PIN_EXISTS', email },
      });

      if (response.error || response.data?.error) {
        return { exists: false, has_pin: false };
      }

      return {
        exists: response.data.exists,
        has_pin: response.data.has_pin,
        user_id: response.data.user_id,
        full_name: response.data.full_name || null,
      };
    } catch {
      return { exists: false, has_pin: false };
    }
  };

  /* ---------------- LOGIN WITH PIN ONLY (for known devices) ---------------- */

  const loginWithPinOnly = async (email: string, userId: string) => {
    try {
      // Call edge function to generate a magic link token_hash for this user
      const response = await supabase.functions.invoke('pin-auth', {
        body: { action: 'CREATE_SESSION', email, user_id: userId },
      });

      console.log('CREATE_SESSION response:', response);

      if (response.error) {
        console.error('Edge function error:', response.error);
        return { error: new Error(response.error.message || 'Failed to create session') };
      }

      if (response.data?.error) {
        console.error('Response data error:', response.data.error);
        return { error: new Error(response.data.error) };
      }

      // If we got a magic link token_hash, verify it to create the session
      // Note: verifyOtp with token_hash does NOT require email parameter
      if (response.data?.token_hash) {
        console.log('Verifying token_hash...');
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: response.data.token_hash,
          type: 'magiclink',
        });

        console.log('verifyOtp result:', { data, error });
        return { error };
      }

      return { error: new Error('No session token received') };
    } catch (err) {
      console.error('loginWithPinOnly exception:', err);
      return { error: err as Error };
    }
  };

  const getAuthRedirectUrl = () => {
  // Web → go to your website
  // Mobile (Capacitor) → deep link back into app
  return Capacitor.isNativePlatform()
    ? 'synka://auth/callback'
    : 'https://synka.in/my-card';
};

const signInWithGoogle = async () => {
  const redirectUrl = getAuthRedirectUrl();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  });

  return { error };
};

  const signInWithLinkedIn = async () => {
    const redirectUrl = getAuthRedirectUrl();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: redirectUrl },
    });
    return { error };
  };

  /* ---------------- SIGN OUT ---------------- */

  const signOut = async () => {
  await supabase.auth.signOut();

  // ❌ DO NOT hard redirect
  // ❌ DO NOT clear cached user

  // Let React Router + HomeRedirect decide
};

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        sendOtp,
        verifyOtp,
        setPin,
        verifyPin,
        checkPinExists,
        loginWithPinOnly,
        signInWithGoogle,
        signInWithLinkedIn,
        signOut,
        createSessionWithOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
