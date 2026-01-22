import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
}

// Default events for new users - single past event example
const getDefaultEvents = () => {
  // Past event: 1 Jan 2026, 10 AM to 5 PM IST
  const startTime = new Date('2026-01-01T10:00:00+05:30');
  const endTime = new Date('2026-01-01T17:00:00+05:30');
  
  return [
    {
      title: 'Networking Meetup',
      description: 'Local business networking event',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    },
  ];
};

// Module-level flag to prevent duplicate seeding across component instances
let isSeedingEvents = false;

const EVENTS_CACHE_KEY = 'synka_events_cache';

const getCachedEvents = (userId: string): Event[] => {
  try {
    const cached = localStorage.getItem(`${EVENTS_CACHE_KEY}_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 30 * 60 * 1000) return data;
    }
  } catch { /* ignore */ }
  return [];
};

const setCachedEvents = (userId: string, data: Event[]) => {
  try {
    localStorage.setItem(`${EVENTS_CACHE_KEY}_${userId}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore */ }
};

export function useEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>(() => user ? getCachedEvents(user.id) : []);
  const [loading, setLoading] = useState(() => user ? getCachedEvents(user.id).length === 0 : false);

  useEffect(() => {
    if (user) {
      const cached = getCachedEvents(user.id);
      if (cached.length > 0 && events.length === 0) {
        setEvents(cached);
        setLoading(false);
      }
      fetchEvents();
    } else {
      setEvents([]);
      setLoading(false);
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } else if (data && data.length === 0) {
      // Seed default events for new users (with guard against race condition)
      if (!isSeedingEvents) {
        isSeedingEvents = true;
        await seedDefaultEvents();
        isSeedingEvents = false;
      }
    } else {
      setEvents(data as Event[]);
      if (user) setCachedEvents(user.id, data as Event[]);
    }
    setLoading(false);
  };

  const seedDefaultEvents = async () => {
    if (!user) return;

    const defaultEvents = getDefaultEvents().map(e => ({
      ...e,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('events')
      .insert(defaultEvents)
      .select();

    if (error) {
      console.error('Error seeding events:', error);
    } else {
      setEvents(data as Event[]);
    }
  };

  const addEvent = async (event: { title: string; start_time: string | null; end_time: string | null; description: string | null }) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('events')
      .insert({ 
        ...event, 
        user_id: user.id,
        start_time: event.start_time || new Date().toISOString() // Fallback to now if null for DB constraint
      })
      .select()
      .single();

    if (!error && data) {
      setEvents(prev => [data as Event, ...prev]);
    }

    return { data, error };
  };

  const updateEvent = async (id: string, updates: Partial<Event>) => {
    const { error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }

    return { error };
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }

    return { error };
  };

  // Get events that are currently active (contact created_at falls within)
  const getActiveEventsForDate = (date: Date) => {
    return events.filter(event => {
      const start = new Date(event.start_time);
      const end = event.end_time ? new Date(event.end_time) : start;
      return date >= start && date <= end;
    });
  };

  return {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getActiveEventsForDate,
    refetch: fetchEvents,
  };
}
