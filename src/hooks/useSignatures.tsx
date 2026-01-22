import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface EmailSignature {
  id: string;
  user_id: string;
  name: string;
  html: string;
  is_selected: boolean;
  created_at: string;
}

const SIGNATURES_CACHE_KEY = 'synka_signatures_cache';

const getCachedSignatures = (userId: string): EmailSignature[] => {
  try {
    const cached = localStorage.getItem(`${SIGNATURES_CACHE_KEY}_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 30 * 60 * 1000) return data;
    }
  } catch { /* ignore */ }
  return [];
};

const setCachedSignatures = (userId: string, data: EmailSignature[]) => {
  try {
    localStorage.setItem(`${SIGNATURES_CACHE_KEY}_${userId}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore */ }
};

export function useSignatures() {
  const { user } = useAuth();
  const [signatures, setSignatures] = useState<EmailSignature[]>(() => user ? getCachedSignatures(user.id) : []);
  const [loading, setLoading] = useState(() => user ? getCachedSignatures(user.id).length === 0 : false);

  useEffect(() => {
    if (user) {
      const cached = getCachedSignatures(user.id);
      if (cached.length > 0 && signatures.length === 0) {
        setSignatures(cached);
        setLoading(false);
      }
      fetchSignatures();
    } else {
      setSignatures([]);
      setLoading(false);
    }
  }, [user]);

  const fetchSignatures = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('email_signatures')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching signatures:', error);
      setSignatures([]);
    } else {
      setSignatures(data as EmailSignature[]);
      if (user) setCachedSignatures(user.id, data as EmailSignature[]);
    }
    setLoading(false);
  };

  const addSignature = async (signature: Omit<EmailSignature, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('email_signatures')
      .insert({ ...signature, user_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setSignatures(prev => [data as EmailSignature, ...prev]);
    }

    return { data, error };
  };

  const updateSignature = async (id: string, updates: Partial<EmailSignature>) => {
    const { error } = await supabase
      .from('email_signatures')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setSignatures(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }

    return { error };
  };

  const deleteSignature = async (id: string) => {
    const { error } = await supabase
      .from('email_signatures')
      .delete()
      .eq('id', id);

    if (!error) {
      setSignatures(prev => prev.filter(s => s.id !== id));
    }

    return { error };
  };

  const selectSignature = async (id: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Deselect all first
    await supabase
      .from('email_signatures')
      .update({ is_selected: false })
      .eq('user_id', user.id);

    // Select the chosen one
    const { error } = await supabase
      .from('email_signatures')
      .update({ is_selected: true })
      .eq('id', id);

    if (!error) {
      setSignatures(prev => prev.map(s => ({ ...s, is_selected: s.id === id })));
    }

    return { error };
  };

  const getSelectedSignature = () => signatures.find(s => s.is_selected);

  return {
    signatures,
    loading,
    addSignature,
    updateSignature,
    deleteSignature,
    selectSignature,
    getSelectedSignature,
    refetch: fetchSignatures,
  };
}
