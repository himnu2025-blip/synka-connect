import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

const DEFAULT_TAGS = [
  { name: 'Hot', color: '#ef4444' },
  { name: 'Warm', color: '#f97316' },
  { name: 'Cold', color: '#3b82f6' },
  { name: 'Client', color: '#22c55e' },
  { name: 'Follow-up', color: '#a855f7' },
];

// Module-level flag to prevent duplicate seeding across component instances
let isSeedingTags = false;

const TAGS_CACHE_KEY = 'synka_tags_cache';

const getCachedTags = (userId: string): Tag[] => {
  try {
    const cached = localStorage.getItem(`${TAGS_CACHE_KEY}_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 30 * 60 * 1000) return data;
    }
  } catch { /* ignore */ }
  return [];
};

const setCachedTags = (userId: string, data: Tag[]) => {
  try {
    localStorage.setItem(`${TAGS_CACHE_KEY}_${userId}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore */ }
};

export function useTags() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>(() => user ? getCachedTags(user.id) : []);
  const [loading, setLoading] = useState(() => user ? getCachedTags(user.id).length === 0 : false);

  useEffect(() => {
    if (user) {
      const cached = getCachedTags(user.id);
      if (cached.length > 0 && tags.length === 0) {
        setTags(cached);
        setLoading(false);
      }
      fetchTags();
    } else {
      setTags([]);
      setLoading(false);
    }
  }, [user]);

  const fetchTags = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      setTags([]);
    } else if (data && data.length === 0) {
      // Seed default tags for new users (with guard against race condition)
      if (!isSeedingTags) {
        isSeedingTags = true;
        await seedDefaultTags();
        isSeedingTags = false;
      }
    } else {
      setTags(data as Tag[]);
      if (user) setCachedTags(user.id, data as Tag[]);
    }
    setLoading(false);
  };

  const seedDefaultTags = async () => {
    if (!user) return;

    const tagsWithUser = DEFAULT_TAGS.map(t => ({
      ...t,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('tags')
      .insert(tagsWithUser)
      .select();

    if (error) {
      console.error('Error seeding tags:', error);
    } else {
      setTags(data as Tag[]);
    }
  };

  const createTag = async (name: string, color?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        name,
        color: color || '#6366f1',
      })
      .select()
      .single();

    if (!error && data) {
      setTags(prev => [...prev, data as Tag]);
    }

    return { data, error };
  };

  const deleteTag = async (id: string) => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (!error) {
      setTags(prev => prev.filter(t => t.id !== id));
    }

    return { error };
  };

  const updateTag = async (id: string, updates: Partial<Tag>) => {
    const { error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }

    return { error };
  };

  return { tags, loading, createTag, deleteTag, updateTag, refetch: fetchTags };
}
