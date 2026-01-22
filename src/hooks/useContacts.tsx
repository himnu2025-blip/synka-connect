import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { persistForOffline, getOfflineData } from '@/lib/offlineSync';

export interface Contact {
  id: string;
  owner_id: string;
  name: string;
  company: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  website: string | null;
  notes?: string | null;
  notes_history: { text: string; timestamp: string }[] | null;
  source: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
  // Optional fields from DB (photo_url and about from scanned cards)
  photo_url?: string | null;
  about?: string | null;
  // synka_user_id for identity linking (deprecated for avatar - use shared_card_id instead)
  synka_user_id?: string | null;
  // shared_card_id for card-centric avatar syncing - avatar updates when THIS specific card's photo changes
  shared_card_id?: string | null;
  tags?: { id: string; name: string; color: string | null }[];
  events?: { id: string; title: string; start_time: string; end_time: string | null }[];
}

const CONTACTS_CACHE_KEY = 'synka_contacts_cache';
const OFFLINE_CONTACTS_KEY = 'contacts';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour for premium feel (stale-while-revalidate)

// Helper to get cached contacts (with offline fallback)
const getCachedContacts = (userId: string): Contact[] => {
  try {
    // Regular cache first
    const cached = localStorage.getItem(`${CONTACTS_CACHE_KEY}_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
    // Offline fallback (7-day TTL)
    const offlineData = getOfflineData<Contact[]>(`${OFFLINE_CONTACTS_KEY}_${userId}`);
    if (offlineData) return offlineData;
  } catch {
    // Ignore cache errors
  }
  return [];
};

// Helper to set cached contacts (+ offline persistence)
const setCachedContacts = (userId: string, data: Contact[]) => {
  try {
    localStorage.setItem(`${CONTACTS_CACHE_KEY}_${userId}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
    // Persist for offline (7-day TTL)
    persistForOffline(`${OFFLINE_CONTACTS_KEY}_${userId}`, data);
  } catch {
    // Ignore cache errors (quota exceeded, etc.)
  }
};

export function useContacts() {
  const { user } = useAuth();
  // Initialize with cached data for instant display
  const [contacts, setContacts] = useState<Contact[]>(() => 
    user ? getCachedContacts(user.id) : []
  );
  // Only show loading if no cached data - premium instant feel
  const [loading, setLoading] = useState(() => 
    user ? getCachedContacts(user.id).length === 0 : false
  );
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);

  useEffect(() => {
    if (user) {
      // Load from cache instantly for premium feel
      const cached = getCachedContacts(user.id);
      if (cached.length > 0) {
        setContacts(cached);
        setLoading(false);
        // Revalidate in background silently
        setIsRevalidating(true);
        fetchContacts().finally(() => setIsRevalidating(false));
      } else {
        // No cache, show loading
        fetchContacts();
      }

      // Listen for data sync events (when coming back online)
      const handleDataSync = () => {
        console.log('[Contacts] Data sync triggered - refetching');
        fetchContacts();
      };
      window.addEventListener('synka:data-sync', handleDataSync);
      return () => window.removeEventListener('synka:data-sync', handleDataSync);
    } else {
      setContacts([]);
      setLoading(false);
      setInitialLoadDone(false);
    }
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;

    // Only show loading spinner on initial load when no contacts exist
    if (!initialLoadDone) {
      setLoading(true);
    }
    
    // Fetch contacts
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      setContacts([]);
      setLoading(false);
      setInitialLoadDone(true);
      return;
    }

    // Fetch tags for contacts
    const contactIds = (contactsData || []).map(c => c.id);
    
    if (contactIds.length > 0) {
      const { data: contactTagsData } = await supabase
        .from('contact_tags')
        .select('contact_id, tag_id, tags(id, name, color)')
        .in('contact_id', contactIds);

      const { data: contactEventsData } = await supabase
        .from('contact_events')
        .select('contact_id, event_id, events(id, title, start_time, end_time)')
        .in('contact_id', contactIds);

      const contactTagsMap: Record<string, any[]> = {};
      const contactEventsMap: Record<string, any[]> = {};

      (contactTagsData || []).forEach((ct: any) => {
        if (!contactTagsMap[ct.contact_id]) contactTagsMap[ct.contact_id] = [];
        if (ct.tags) contactTagsMap[ct.contact_id].push(ct.tags);
      });

      (contactEventsData || []).forEach((ce: any) => {
        if (!contactEventsMap[ce.contact_id]) contactEventsMap[ce.contact_id] = [];
        if (ce.events) contactEventsMap[ce.contact_id].push(ce.events);
      });

      const formattedContacts = (contactsData || []).map(contact => ({
        ...contact,
        tags: contactTagsMap[contact.id] || [],
        events: contactEventsMap[contact.id] || [],
      }));

      setContacts(formattedContacts as Contact[]);
      // Cache for next visit
      if (user) setCachedContacts(user.id, formattedContacts as Contact[]);
    } else {
      setContacts([]);
      if (user) setCachedContacts(user.id, []);
    }
    
    setLoading(false);
    setInitialLoadDone(true);
  };

  const createContact = async (contactData: Partial<Contact>, eventIds?: string[]) => {
    if (!user) return { error: new Error('Not authenticated'), data: null };

    // Build notes_history array if notes provided
    const notesHistory = contactData.notes 
      ? [{ text: contactData.notes, timestamp: new Date().toISOString() }]
      : [];

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        owner_id: user.id,
        name: contactData.name || '',
        company: contactData.company || null,
        designation: contactData.designation || null,
        email: contactData.email || null,
        phone: contactData.phone || null,
        whatsapp: contactData.whatsapp || null,
        linkedin: contactData.linkedin || null,
        website: contactData.website || null,
        notes_history: notesHistory,
        source: contactData.source || 'manual',
      })
      .select()
      .single();

    if (!error && data) {
      // Add event associations if provided
      if (eventIds && eventIds.length > 0) {
        const contactEventInserts = eventIds.map(eventId => ({
          contact_id: data.id,
          event_id: eventId,
        }));
        await supabase.from('contact_events').insert(contactEventInserts);
      }
      
      // Refresh to get full data with tags/events
      await fetchContacts();
    }

    return { data, error };
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    const { notes, tags, events, ...dbUpdates } = updates as any;
    
    const { error } = await supabase
      .from('contacts')
      .update(dbUpdates)
      .eq('id', id);

    if (!error) {
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }

    return { error };
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (!error) {
      const updatedContacts = contacts.filter(c => c.id !== id);
      setContacts(updatedContacts);
      // Update cache immediately so deleted contact doesn't flash on page return
      if (user) setCachedContacts(user.id, updatedContacts);
    }

    return { error };
  };

  const addTagToContact = async (contactId: string, tagId: string) => {
    const { error } = await supabase
      .from('contact_tags')
      .insert({ contact_id: contactId, tag_id: tagId });

    // Don't auto-refetch - let caller handle UI updates
    return { error };
  };

  const removeTagFromContact = async (contactId: string, tagId: string) => {
    const { error } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId)
      .eq('tag_id', tagId);

    // Don't auto-refetch - let caller handle UI updates
    return { error };
  };

  const addEventToContact = async (contactId: string, eventId: string) => {
    const { error } = await supabase
      .from('contact_events')
      .insert({ contact_id: contactId, event_id: eventId });

    // Don't auto-refetch - let caller handle UI updates
    return { error };
  };

  const removeEventFromContact = async (contactId: string, eventId: string) => {
    const { error } = await supabase
      .from('contact_events')
      .delete()
      .eq('contact_id', contactId)
      .eq('event_id', eventId);

    // Don't auto-refetch - let caller handle UI updates
    return { error };
  };

  return {
    contacts,
    loading,
    createContact,
    updateContact,
    deleteContact,
    addTagToContact,
    removeTagFromContact,
    addEventToContact,
    removeEventFromContact,
    refetch: fetchContacts,
  };
}

// Function for public contact form submission
export async function submitPublicContact(
  ownerUserId: string,
  contactData: {
    name: string;
    company?: string;
    designation?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    linkedin?: string;
    notes?: string;
  }
) {
  // Handle phone/whatsapp logic
  const phone = contactData.phone || contactData.whatsapp || null;
  const whatsapp = contactData.whatsapp || contactData.phone || null;

  // Build notes_history array if notes provided - use 'text' and 'timestamp' to match CRM display
  const notesHistory = contactData.notes 
    ? [{ text: contactData.notes, timestamp: new Date().toISOString() }]
    : [];

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      owner_id: ownerUserId,
      name: contactData.name,
      company: contactData.company || null,
      designation: contactData.designation || null,
      email: contactData.email || null,
      phone,
      whatsapp,
      linkedin: contactData.linkedin || null,
      notes_history: notesHistory,
      source: 'public_form',
    })
    .select()
    .single();

  if (contactError) {
    console.error('Error creating contact:', contactError);
    return { error: contactError };
  }

  // Auto-tag with active events for the card owner
  if (contact) {
    // Fetch events for the owner that are currently active
    const now = new Date();
    const { data: ownerEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', ownerUserId);

    if (ownerEvents && ownerEvents.length > 0) {
      const activeEvents = ownerEvents.filter(event => {
        const start = new Date(event.start_time);
        const end = event.end_time ? new Date(event.end_time) : start;
        return now >= start && now <= end;
      });

      if (activeEvents.length > 0) {
        const contactEventInserts = activeEvents.map(event => ({
          contact_id: contact.id,
          event_id: event.id,
        }));
        await supabase.from('contact_events').insert(contactEventInserts);
      }
    }
  }

  return { data: contact, error: null };
      }
