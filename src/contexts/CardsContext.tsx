import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { persistForOffline, getOfflineData, isOnline } from '@/lib/offlineSync';

// Generate default signature HTML from card data
const generateDefaultSignatureHtml = (card: Card): string => {
  const websiteLink = card.website 
    ? `<tr><td style="padding-top: 4px; text-align: left;"><a href="${card.website.startsWith('http') ? card.website : 'https://' + card.website}" style="color: #4F46E5; text-decoration: none; font-size: 12px;">${card.website.replace(/^https?:\/\//, '')}</a></td></tr>` 
    : '';

  const linkedinLink = card.linkedin 
    ? `<tr><td style="padding-top: 4px; text-align: left;"><a href="${card.linkedin.startsWith('http') ? card.linkedin : 'https://linkedin.com/in/' + card.linkedin}" style="color: #0077B5; text-decoration: none; font-size: 12px;">LinkedIn</a></td></tr>` 
    : '';

  const photoCell = card.photo_url 
    ? `<td style="padding-right: 15px; vertical-align: top;">
        <img src="${card.photo_url}" alt="${card.full_name || ''}" width="80" height="80" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; display: block;" />
       </td>` 
    : '';

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333;">
  <tr>
    ${photoCell}
    <td style="border-left: 3px solid #4F46E5; padding-left: 15px; vertical-align: top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size: 18px; font-weight: bold; color: #1a1a1a; padding-bottom: 4px; text-align: left;">${card.full_name || 'Your Name'}</td></tr>
        <tr><td style="font-size: 13px; color: #666666; padding-bottom: 12px; text-align: left;">${card.designation || ''}${card.company ? ` | ${card.company}` : ''}</td></tr>
        <tr><td style="font-size: 12px; color: #333333; text-align: left;">${card.email ? `<a href="mailto:${card.email}" style="color: #4F46E5; text-decoration: none;">${card.email}</a>` : ''}</td></tr>
        <tr><td style="font-size: 12px; color: #333333; padding-top: 2px; text-align: left;">${card.phone || ''}</td></tr>
        ${websiteLink}
        ${linkedinLink}
      </table>
    </td>
  </tr>
</table>`;
};

export interface Card {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  company: string | null;
  title: string | null;
  designation: string | null;
  website: string | null;
  linkedin: string | null;
  photo_url: string | null;
  logo_url: string | null;
  about: string | null;
  layout: string | null;
  card_design: string | null;
  layout_template_id: string | null;
  face_x: number | null;
  face_y: number | null;
  logo_x: number | null;
  logo_y: number | null;
  pitch_deck_url: string | null;
  catalogue_url: string | null;
  document_name: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CardsContextType {
  cards: Card[];
  activeCard: Card | null;
  loading: boolean;
  createCard: (name: string) => Promise<{ data?: Card; error?: string }>;
  updateCard: (cardId: string, updates: Partial<Card>) => Promise<{ data?: Card; error?: string }>;
  deleteCard: (cardId: string) => Promise<{ success?: boolean; error?: string }>;
  setDefaultCard: (cardId: string) => Promise<{ data?: Card; error?: string }>;
  selectCard: (cardId: string) => Promise<Card | null>;
  refetch: () => Promise<void>;
}

const CardsContext = createContext<CardsContextType | null>(null);

const CARDS_CACHE_KEY = 'synka_cards_cache';
const OFFLINE_CARDS_KEY = 'cards';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour for premium feel

// Get cached cards from localStorage (fast startup)
const getCachedCards = (userId: string): { cards: Card[], activeCard: Card | null } => {
  try {
    // First check regular cache
    const cached = localStorage.getItem(`${CARDS_CACHE_KEY}_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
    // Fallback to offline cache (longer TTL - 7 days)
    const offlineData = getOfflineData<{ cards: Card[], activeCard: Card | null }>(`${OFFLINE_CARDS_KEY}_${userId}`);
    if (offlineData) return offlineData;
  } catch { /* ignore */ }
  return { cards: [], activeCard: null };
};

// Set cached cards in localStorage and offline storage
const setCachedCards = (userId: string, cards: Card[], activeCard: Card | null) => {
  const data = { cards, activeCard };
  try {
    // Regular cache
    localStorage.setItem(`${CARDS_CACHE_KEY}_${userId}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
    // Offline cache (longer TTL)
    persistForOffline(`${OFFLINE_CARDS_KEY}_${userId}`, data);
  } catch { /* ignore */ }
};

export function CardsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // ✅ INSTANT LOAD: Hydrate from cache immediately for premium PWA feel
  const [cards, setCards] = useState<Card[]>(() => {
    if (!user) return [];
    const cached = getCachedCards(user.id);
    return cached.cards;
  });
  const [activeCard, setActiveCard] = useState<Card | null>(() => {
    if (!user) return null;
    const cached = getCachedCards(user.id);
    return cached.activeCard;
  });
  // Only show loading if no cached data exists
  const [loading, setLoading] = useState(() => {
    if (!user) return false;
    const cached = getCachedCards(user.id);
    return cached.cards.length === 0;
  });
  
  const initialLoadDoneRef = useRef(false);

  // Bootstrap retry (handles signup/login race where the default card is created/updated right after auth)
  const bootstrapRetryCountRef = useRef(0);
  const bootstrapRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBootstrapRetry = useCallback(() => {
    bootstrapRetryCountRef.current = 0;
    if (bootstrapRetryTimerRef.current) {
      clearTimeout(bootstrapRetryTimerRef.current);
      bootstrapRetryTimerRef.current = null;
    }
  }, []);

  const fetchCards = useCallback(async () => {
    if (!user) {
      clearBootstrapRetry();
      setCards([]);
      setActiveCard(null);
      setLoading(false);
      initialLoadDoneRef.current = false;
      return;
    }

    // Set loading on first load (no cache usage)
    if (!initialLoadDoneRef.current) {
      setLoading(true);
    }

    // Fetch cards (no auto-create here; auth guarantees a default card)
    const { data: fetchedData, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching cards:', fetchError);
      setLoading(false);
      initialLoadDoneRef.current = true;
      clearBootstrapRetry();
      return;
    }

    const fetchedCards = (fetchedData ?? []) as Card[];

    // Strict default card selection - only use is_default, no fallback
    const defaultCard = fetchedCards.find(c => c.is_default) ?? null;

    // On fresh signup/login there can be a short race where the default card
    // is created/updated after auth state is set. Retry briefly instead of requiring refresh.
    const expectedEmail = user.email || '';

    // Check if the card has the essential data (at minimum, email or name should match)
    const isCardReady = defaultCard && (
      defaultCard.email === expectedEmail || 
      (defaultCard.full_name && defaultCard.full_name.length > 0)
    );

    const shouldRetryBootstrap = !initialLoadDoneRef.current && !isCardReady;

    setCards(fetchedCards);

    // Keep UI in skeleton state until we have the real, hydrated default card
    setActiveCard(shouldRetryBootstrap ? null : defaultCard);

    // Cache ONLY real data (when default card exists and is ready)
    if (!shouldRetryBootstrap && defaultCard) {
      setCachedCards(user.id, fetchedCards, defaultCard);
    }

    if (shouldRetryBootstrap && bootstrapRetryCountRef.current < 10) {
      bootstrapRetryCountRef.current += 1;
      if (bootstrapRetryTimerRef.current) clearTimeout(bootstrapRetryTimerRef.current);
      bootstrapRetryTimerRef.current = setTimeout(() => {
        fetchCards();
      }, 250);
      return;
    }

    setLoading(false);
    initialLoadDoneRef.current = true;
    clearBootstrapRetry();
  }, [user, clearBootstrapRetry]);

  // Refetch cards when user changes (e.g., after signup/login)
  useEffect(() => {
    clearBootstrapRetry();

    if (!user) {
      initialLoadDoneRef.current = false;
      return;
    }

    // ✅ INSTANT: Load from cache first, then fetch fresh data in background
    const cached = getCachedCards(user.id);
    if (cached.cards.length > 0 && cached.activeCard) {
      setCards(cached.cards);
      setActiveCard(cached.activeCard);
      setLoading(false);
      // Background revalidate
      fetchCards();
    } else {
      fetchCards();
    }

    // Listen for data sync events (when coming back online)
    const handleDataSync = () => {
      console.log('[Cards] Data sync triggered - refetching');
      fetchCards();
    };
    window.addEventListener('synka:data-sync', handleDataSync);

    return () => {
      clearBootstrapRetry();
      window.removeEventListener('synka:data-sync', handleDataSync);
    };
  }, [user?.id, fetchCards, clearBootstrapRetry]);

  const createCard = async (name: string) => {
    if (!user) return { error: 'Not authenticated' };

    // Check for duplicate card name for this user
    const duplicateExists = cards.some(
      c => c.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (duplicateExists) {
      return { error: 'A card with this name already exists' };
    }

    // Find default card to copy essential profile data (photo, logo, name, etc.)
    const defaultCard = cards.find(c => c.is_default) || cards[0];
    
    // Create new card with copied profile data for better UX
    const newCardData: Record<string, unknown> = {
      user_id: user.id,
      name: name.trim(),
      is_default: false,
    };

    // Copy essential fields from default card if available
    if (defaultCard) {
      if (defaultCard.photo_url) newCardData.photo_url = defaultCard.photo_url;
      if (defaultCard.logo_url) newCardData.logo_url = defaultCard.logo_url;
      if (defaultCard.full_name) newCardData.full_name = defaultCard.full_name;
      if (defaultCard.email) newCardData.email = defaultCard.email;
      if (defaultCard.phone) newCardData.phone = defaultCard.phone;
      if (defaultCard.company) newCardData.company = defaultCard.company;
      if (defaultCard.designation) newCardData.designation = defaultCard.designation;
      if (defaultCard.face_x !== null) newCardData.face_x = defaultCard.face_x;
      if (defaultCard.face_y !== null) newCardData.face_y = defaultCard.face_y;
      if (defaultCard.logo_x !== null) newCardData.logo_x = defaultCard.logo_x;
      if (defaultCard.logo_y !== null) newCardData.logo_y = defaultCard.logo_y;
    }

    const { data, error } = await supabase
      .from('cards')
      .insert(newCardData)
      .select()
      .single();

    if (error) return { error: error.message };

    const createdCard = data as Card;
    // Add to list and set as active immediately
    setCards(prev => [...prev, createdCard]);
    setActiveCard(createdCard);

    return { data: createdCard };
  };

  const updateCard = async (cardId: string, updates: Partial<Card>) => {
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', cardId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  const updatedCard = data as Card;

  // ✅ STEP 1: prepare updated cards list
  const nextCards = cards.map(c =>
    c.id === cardId ? updatedCard : c
  );

  // ✅ STEP 2: update UI immediately
  setCards(nextCards);

  if (activeCard?.id === cardId) {
    setActiveCard(updatedCard);
  }

  // ✅ STEP 3: VERY IMPORTANT – update cache immediately
  // This fixes the layout showing wrong after refresh
  if (activeCard?.id === cardId) {
    setCachedCards(user.id, nextCards, updatedCard);
  } else {
    setCachedCards(user.id, nextCards, activeCard);
  }

  return { data: updatedCard };
};

  const deleteCard = async (cardId: string) => {
    if (!user) return { error: 'Not authenticated' };
    if (cards.length <= 1) return { error: 'Cannot delete the only card' };

    const cardToDelete = cards.find(c => c.id === cardId);

    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (error) return { error: error.message };

    const remaining = cards.filter(c => c.id !== cardId);
    setCards(remaining);

    // If we deleted the default card, make another one default and set it active
    if (cardToDelete?.is_default && remaining.length > 0) {
      await setDefaultCard(remaining[0].id);
      setActiveCard(remaining[0]);
    } else if (activeCard?.id === cardId) {
      setActiveCard(remaining[0] || null);
    }

    return { success: true };
  };

  const setDefaultCard = async (cardId: string) => {
    if (!user) return { error: 'Not authenticated' };

    // First, unset all defaults
    await supabase
      .from('cards')
      .update({ is_default: false })
      .eq('user_id', user.id);

    // Then set the new default
    const { data, error } = await supabase
      .from('cards')
      .update({ is_default: true })
      .eq('id', cardId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) return { error: error?.message };

    const updatedDefault = data as Card;

    // ✅ CRITICAL FIX: Calculate nextCards BEFORE state update to avoid stale references
    const nextCards = cards.map(c => ({
      ...c,
      is_default: c.id === cardId,
    }));

    // Update all state atomically
    setCards(nextCards);
    setActiveCard(updatedDefault);
    
    // ✅ Cache EXACTLY what UI will show (no race condition)
    setCachedCards(user.id, nextCards, updatedDefault);

    return { data: updatedDefault };
  };

  // Select a card as active (for viewing/editing)
  const selectCard = async (cardId: string): Promise<Card | null> => {
    const card = cards.find(c => c.id === cardId) ?? null;
    if (card) {
      setActiveCard(card);
      return card;
    }
    return null;
  };

  return (
    <CardsContext.Provider value={{
      cards,
      activeCard,
      loading,
      createCard,
      updateCard,
      deleteCard,
      setDefaultCard,
      selectCard,
      refetch: fetchCards,
    }}>
      {children}
    </CardsContext.Provider>
  );
}

export function useCards() {
  const context = useContext(CardsContext);
  if (!context) {
    throw new Error('useCards must be used within a CardsProvider');
  }
  return context;
}

// Get default card by slug for public view (doesn't need context)
// Optimized: accepts optional user_id to skip redundant profile lookup
export async function getDefaultCardBySlug(slug: string, userId?: string): Promise<Card | null> {
  let targetUserId = userId;
  
  // Only fetch profile if user_id not provided
  if (!targetUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('slug', slug)
      .maybeSingle();

    if (!profile) return null;
    targetUserId = profile.user_id;
  }

  const { data: card } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('is_default', true)
    .maybeSingle();

  return card as Card | null;
}

// Fast combined query for public card view - single DB round trip
export async function getPublicCardData(slug: string): Promise<{
  profile: import('@/hooks/useProfile').Profile & import('@/hooks/useProfile').ProfileCompat | null;
  card: Card | null;
}> {
  // Single query to get profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (profileError || !profileData) {
    return { profile: null, card: null };
  }

  // Map profile with compatibility fields
  const profile = {
    ...profileData,
    name: profileData.full_name || '',
    designation: profileData.designation || profileData.title || '',
    company: profileData.company || '',
    phone: profileData.phone || '',
    email: profileData.email || '',
    website: profileData.website || '',
    whatsapp: profileData.whatsapp || '',
    linkedin: profileData.linkedin || '',
    about: profileData.about || '',
    photo_url: profileData.photo_url || '',
    logo_url: profileData.logo_url || '',
    card_design: profileData.card_design || 'minimal',
    public_slug: profileData.slug || '',
  } as import('@/hooks/useProfile').Profile & import('@/hooks/useProfile').ProfileCompat;

  // Get default card in parallel with profile mapping
  const { data: cardData } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', profileData.user_id)
    .eq('is_default', true)
    .maybeSingle();

  return { profile, card: cardData as Card | null };
}
