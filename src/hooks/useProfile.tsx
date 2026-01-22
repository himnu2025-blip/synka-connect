import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { persistForOffline, getOfflineData } from '@/lib/offlineSync';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  about: string | null;
  photo_url: string | null;
  logo_url: string | null;
  slug: string | null;
  layout: string | null;
  website: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  designation: string | null;
  card_design: string | null;
  card_name: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
}

// Alias for compatibility
export interface ProfileCompat {
  name: string;
  designation: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  whatsapp: string;
  linkedin: string;
  about: string;
  photo_url: string;
  logo_url: string;
  card_design: string;
  public_slug: string;
}

const PROFILE_CACHE_KEY = 'synka_profile_cache';
const OFFLINE_PROFILE_KEY = 'profile';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour for premium feel

// Helper to get cached profile (with offline fallback)
const getCachedProfile = (userId: string): (Profile & ProfileCompat) | null => {
  try {
    // Regular cache first
    const cached = localStorage.getItem(`${PROFILE_CACHE_KEY}_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
    // Offline fallback (7-day TTL)
    const offlineData = getOfflineData<Profile & ProfileCompat>(`${OFFLINE_PROFILE_KEY}_${userId}`);
    if (offlineData) return offlineData;
  } catch {
    // Ignore cache errors
  }
  return null;
};

// Helper to set cached profile (+ offline persistence)
const setCachedProfile = (userId: string, data: Profile & ProfileCompat) => {
  try {
    localStorage.setItem(`${PROFILE_CACHE_KEY}_${userId}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
    // Persist for offline (7-day TTL)
    persistForOffline(`${OFFLINE_PROFILE_KEY}_${userId}`, data);
  } catch {
    // Ignore cache errors
  }
};

export function useProfile() {
  const { user } = useAuth();
  // Initialize with cached data for instant display
  const [profile, setProfile] = useState<(Profile & ProfileCompat) | null>(() => 
    user ? getCachedProfile(user.id) : null
  );
  // Only show loading if no cached data exists
  const [loading, setLoading] = useState(() => 
    user ? getCachedProfile(user.id) === null : false
  );
  const [isRevalidating, setIsRevalidating] = useState(false);

  useEffect(() => {
    if (user) {
      // Load from cache instantly - premium feel
      const cached = getCachedProfile(user.id);
      if (cached) {
        setProfile(cached);
        setLoading(false);
        // Revalidate in background silently
        setIsRevalidating(true);
        fetchProfile().finally(() => setIsRevalidating(false));
      } else {
        // No cache, show loading and fetch
        setLoading(true);
        fetchProfile();
      }

      // Listen for data sync events (when coming back online)
      const handleDataSync = () => {
        console.log('[Profile] Data sync triggered - refetching');
        fetchProfile();
      };
      window.addEventListener('synka:data-sync', handleDataSync);
      return () => window.removeEventListener('synka:data-sync', handleDataSync);
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const mapToCompatProfile = (data: any): Profile & ProfileCompat => ({
    ...data,
    name: data.full_name || '',
    designation: data.designation || data.title || '',
    company: data.company || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    whatsapp: data.whatsapp || '',
    linkedin: data.linkedin || '',
    about: data.about || '',
    photo_url: data.photo_url || '',
    logo_url: data.logo_url || '',
    card_design: data.card_design || 'minimal',
    public_slug: data.slug || '',
  });

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      if (data) {
        const mappedProfile = mapToCompatProfile(data);
        setProfile(mappedProfile);
        setCachedProfile(user.id, mappedProfile);
        setLoading(false);
        return;
      }

      // Profile doesn't exist - create one
      const baseSlug = user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Date.now()}`;
      const slug = `${baseSlug}${Math.floor(Math.random() * 1000)}`;
      
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || '';
      const userPhone = user.user_metadata?.phone || '';
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          full_name: userName,
          phone: userPhone,
          slug: slug,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        // If insert failed, try to fetch again (might be a race condition)
        const { data: retryData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (retryData) {
          const mappedProfile = mapToCompatProfile(retryData);
          setProfile(mappedProfile);
          setCachedProfile(user.id, mappedProfile);
        } else {
          setProfile(null);
        }
      } else if (newProfile) {
        const mappedProfile = mapToCompatProfile(newProfile);
        setProfile(mappedProfile);
        setCachedProfile(user.id, mappedProfile);
      }
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile & ProfileCompat>) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Map compatibility fields to actual DB fields
    const dbUpdates: Record<string, any> = {};
    
    if ('name' in updates) dbUpdates.full_name = updates.name;
    if ('full_name' in updates) dbUpdates.full_name = updates.full_name;
    if ('designation' in updates) dbUpdates.designation = updates.designation;
    if ('title' in updates) dbUpdates.title = updates.title;
    if ('company' in updates) dbUpdates.company = updates.company;
    if ('phone' in updates) dbUpdates.phone = updates.phone;
    if ('email' in updates) dbUpdates.email = updates.email;
    if ('website' in updates) dbUpdates.website = updates.website;
    if ('whatsapp' in updates) dbUpdates.whatsapp = updates.whatsapp;
    if ('linkedin' in updates) dbUpdates.linkedin = updates.linkedin;
    if ('about' in updates) dbUpdates.about = updates.about;
    if ('photo_url' in updates) dbUpdates.photo_url = updates.photo_url;
    if ('logo_url' in updates) dbUpdates.logo_url = updates.logo_url;
    if ('card_design' in updates) dbUpdates.card_design = updates.card_design;
    if ('card_name' in updates) dbUpdates.card_name = updates.card_name;
    if ('layout' in updates) dbUpdates.layout = updates.layout;
    if ('slug' in updates) dbUpdates.slug = updates.slug;
    if ('public_slug' in updates) dbUpdates.slug = updates.public_slug;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates, ...dbUpdates } as Profile & ProfileCompat : null);
    }

    return { error };
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
}

export async function getProfileBySlug(slug: string): Promise<(Profile & ProfileCompat) | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile by slug:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    name: data.full_name || '',
    designation: data.designation || data.title || '',
    company: data.company || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    whatsapp: data.whatsapp || '',
    linkedin: data.linkedin || '',
    about: data.about || '',
    photo_url: data.photo_url || '',
    logo_url: data.logo_url || '',
    card_design: data.card_design || 'minimal',
    public_slug: data.slug || '',
  } as Profile & ProfileCompat;
}
