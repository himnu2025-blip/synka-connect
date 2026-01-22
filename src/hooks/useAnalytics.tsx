import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AnalyticsData {
  card_views: number;
  contact_saves: number;
  connections_added: number;
  attended_events: number;
  views_in_attended_events: number;
}

export interface AttendedEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  unique_views: number;
  contact_saves: number;
  connections_added: number;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Generate a device hash for tracking unique devices
export function generateDeviceHash(): string {
  const userAgent = navigator.userAgent;
  const screenRes = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  
  // Create a simple hash from device characteristics
  const str = `${userAgent}|${screenRes}|${timezone}|${language}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Log a scan event (QR or NFC view)
export async function logScanEvent(
  userId: string,
  cardId: string | null,
  source: 'qr' | 'nfc' = 'qr',
  eventId: string | null
): Promise<void> {
  const deviceHash = generateDeviceHash();

  await supabase.from('scan_events').insert({
    user_id: userId,
    card_id: cardId,
    event_id: eventId, // ✅ enables event analytics on dashboard
    source,
    device_hash: deviceHash,
    user_agent: navigator.userAgent,
  });
}
// Log a contact save event
export async function logContactSave(
  userId: string,
  cardId: string | null
): Promise<void> {
  const deviceHash = generateDeviceHash();
  
  await supabase.from('contact_saves').insert({
    user_id: userId,
    card_id: cardId,
    device_hash: deviceHash,
  });
}

export function useAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async (
    startDate?: Date,
    endDate?: Date
  ) => {
    if (!user) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_dashboard_analytics', {
        p_user_id: user.id,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching analytics:', error);
        setAnalytics({
          card_views: 0,
          contact_saves: 0,
          connections_added: 0,
          attended_events: 0,
          views_in_attended_events: 0,
        });
      } else if (data) {
        const analyticsData = data as unknown as AnalyticsData;
        setAnalytics({
          card_views: analyticsData.card_views ?? 0,
          contact_saves: analyticsData.contact_saves ?? 0,
          connections_added: analyticsData.connections_added ?? 0,
          attended_events: analyticsData.attended_events ?? 0,
          views_in_attended_events: analyticsData.views_in_attended_events ?? 0,
        });
      } else {
        setAnalytics({
          card_views: 0,
          contact_saves: 0,
          connections_added: 0,
          attended_events: 0,
          views_in_attended_events: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setAnalytics({
        card_views: 0,
        contact_saves: 0,
        connections_added: 0,
        attended_events: 0,
        views_in_attended_events: 0,
      });
    }
    
    setLoading(false);
  }, [user]);

  const fetchAttendedEvents = useCallback(async (
    startDate?: Date,
    endDate?: Date
  ): Promise<AttendedEvent[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase.rpc('get_attended_events_list', {
        p_user_id: user.id,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching attended events:', error);
        return [];
      }
      
      return (data as unknown as AttendedEvent[]) || [];
    } catch (err) {
      console.error('Error fetching attended events:', err);
      return [];
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    refetch: fetchAnalytics,
    fetchAttendedEvents,
  };
}
