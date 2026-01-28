import { cn } from '@/lib/utils';

interface SocialLinkChipProps {
  platform: 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'calendly';
  url: string;
  className?: string;
}

// Premium monochrome icons (Apple-grade ultra premium)
const SocialIcons = {
  instagram: () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  youtube: () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  twitter: () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  facebook: () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  calendly: () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.655 14.262c-.124.209-.258.41-.402.603a6.642 6.642 0 0 1-2.126 1.876c-.259.153-.53.29-.81.41-.592.255-1.23.427-1.89.51a6.6 6.6 0 0 1-2.088-.067 6.672 6.672 0 0 1-4.808-3.803 6.636 6.636 0 0 1-.507-1.795 6.596 6.596 0 0 1 .142-2.347 6.65 6.65 0 0 1 1.338-2.645 6.674 6.674 0 0 1 2.081-1.673c.262-.135.533-.253.812-.354a6.598 6.598 0 0 1 2.976-.4c.68.07 1.335.24 1.95.5.288.122.567.262.836.42a6.664 6.664 0 0 1 2.094 1.872c.145.195.28.398.404.609l2.407-1.39a9.322 9.322 0 0 0-1.28-1.727 9.419 9.419 0 0 0-2.623-2.006 9.294 9.294 0 0 0-1.596-.695 9.353 9.353 0 0 0-5.848-.02 9.32 9.32 0 0 0-3.096 1.673 9.387 9.387 0 0 0-2.317 2.755 9.344 9.344 0 0 0-1.053 3.164 9.324 9.324 0 0 0 .088 3.293 9.342 9.342 0 0 0 1.059 2.81 9.39 9.39 0 0 0 1.885 2.297 9.41 9.41 0 0 0 2.508 1.652 9.303 9.303 0 0 0 2.9.786 9.346 9.346 0 0 0 2.948-.096 9.306 9.306 0 0 0 2.679-.923 9.388 9.388 0 0 0 2.996-2.617 9.326 9.326 0 0 0 1.29-1.993l-2.404-1.389z"/>
      <path d="M14.07 10.312a2.362 2.362 0 0 0-2.058-1.2 2.367 2.367 0 0 0-2.059 1.2 2.362 2.362 0 0 0 0 2.376 2.367 2.367 0 0 0 2.059 1.2 2.362 2.362 0 0 0 2.058-1.2 2.36 2.36 0 0 0 0-2.376z"/>
    </svg>
  ),
};

const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'Twitter',
  facebook: 'Facebook',
  calendly: 'Book a meeting',
};

/**
 * Construct full URL from stored value (username/handle/path)
 * DB stores: username only for social, full URL for calendly
 */
const getFullUrl = (platform: string, value: string): string => {
  if (!value) return '';
  
  // If already a full URL (calendly or legacy data), use as-is
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${value}`;
    case 'twitter':
      return `https://x.com/${value}`;
    case 'facebook':
      return `https://www.facebook.com/${value}`;
    case 'youtube':
      // Handle both @handle and channel/ID formats
      if (value.startsWith('@') || value.startsWith('channel/')) {
        return `https://www.youtube.com/${value}`;
      }
      return `https://www.youtube.com/@${value}`;
    case 'calendly':
      // Calendly should already be full URL, but fallback
      return `https://calendly.com/${value}`;
    default:
      return value;
  }
};

export function SocialLinkChip({ platform, url, className }: SocialLinkChipProps) {
  if (!url) return null;

  const Icon = SocialIcons[platform];
  const label = platformLabels[platform];
  const fullUrl = getFullUrl(platform, url);

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className={cn(
        "flex items-center gap-4 px-4 py-3",
        className
      )}>
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-muted/60 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Icon />
        </div>

        {/* Text */}
        <p className="text-[15px] font-medium text-foreground truncate flex-1">
          {label}
        </p>
      </div>

      {/* Apple-style separator */}
      <div className="ml-[72px] h-px bg-border/40 group-last:hidden" />
    </a>
  );
}
