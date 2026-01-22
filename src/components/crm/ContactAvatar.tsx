import { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ContactAvatarProps {
  name: string;
  photoUrl?: string | null; // snapshot at save-time
  /** @deprecated */
  synkaUserId?: string | null;
  /** Card ID from which this contact was shared */
  sharedCardId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Card-centric avatar hook
 * - No flicker
 * - No dependency on default card
 * - Realtime safe
 */
const useDynamicPhoto = (
  sharedCardId: string | null | undefined,
  initialPhotoUrl?: string | null
) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    initialPhotoUrl ?? null
  );

  useEffect(() => {
    if (!sharedCardId) return;

    let cancelled = false;

    // 1️⃣ Initial fetch (only update if different)
    const fetchPhoto = async () => {
      const { data } = await supabase
        .from('cards')
        .select('photo_url')
        .eq('id', sharedCardId)
        .maybeSingle();

      if (!cancelled && data?.photo_url !== photoUrl) {
        setPhotoUrl(data?.photo_url ?? null);
      }
    };

    fetchPhoto();

    // 2️⃣ Realtime updates
    const channel = supabase
      .channel(`card-avatar-${sharedCardId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cards',
          filter: `id=eq.${sharedCardId}`,
        },
        (payload) => {
          setPhotoUrl(payload.new?.photo_url ?? null);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sharedCardId]);

  return photoUrl;
};

// Initials helper
const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-lg',
  lg: 'w-24 h-24 text-2xl',
};

const appleAvatarBg = 'bg-[#F2F2F7]';
const appleAvatarText = 'text-[#1C1C1E]';

export const ContactAvatar = memo(function ContactAvatar({
  name,
  photoUrl: staticPhotoUrl,
  sharedCardId,
  size = 'sm',
  className,
}: ContactAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // 🔑 Dynamic photo seeded with snapshot
  const dynamicPhotoUrl = useDynamicPhoto(sharedCardId, staticPhotoUrl);

  // ✅ FINAL SOURCE OF TRUTH
  const effectivePhotoUrl =
    sharedCardId ? dynamicPhotoUrl ?? staticPhotoUrl : staticPhotoUrl;

  useEffect(() => {
    setImageError(false);
  }, [effectivePhotoUrl]);

  const initials = getInitials(name);

  // Fallback only when photo truly doesn't exist
  if (!effectivePhotoUrl || imageError) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium flex-shrink-0',
          appleAvatarBg,
          appleAvatarText,
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={effectivePhotoUrl}
      alt={name}
      className={cn(
        'rounded-full object-cover flex-shrink-0',
        sizeClasses[size],
        className
      )}
      onError={() => setImageError(true)}
    />
  );
});
