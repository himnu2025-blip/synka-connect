import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Plus } from 'lucide-react';
import {
  SocialPlatform,
  normalizeSocialLink,
  getSocialPlaceholder,
  getSocialLabel,
} from '@/lib/socialNormalizer';

interface SocialLinksEditorProps {
  values: {
    instagram?: string;
    youtube?: string;
    twitter?: string;
    facebook?: string;
    calendly?: string;
  };
  onChange: (platform: SocialPlatform, value: string) => void;
  disabled?: boolean;
}

// Premium monochrome icons (Apple-grade ultra premium - same as SocialLinkChip)
const SocialIcons = {
  instagram: () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  youtube: () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  twitter: () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  facebook: () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  calendly: () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.655 14.262c-.124.209-.258.41-.402.603a6.642 6.642 0 0 1-2.126 1.876c-.259.153-.53.29-.81.41-.592.255-1.23.427-1.89.51a6.6 6.6 0 0 1-2.088-.067 6.672 6.672 0 0 1-4.808-3.803 6.636 6.636 0 0 1-.507-1.795 6.596 6.596 0 0 1 .142-2.347 6.65 6.65 0 0 1 1.338-2.645 6.674 6.674 0 0 1 2.081-1.673c.262-.135.533-.253.812-.354a6.598 6.598 0 0 1 2.976-.4c.68.07 1.335.24 1.95.5.288.122.567.262.836.42a6.664 6.664 0 0 1 2.094 1.872c.145.195.28.398.404.609l2.407-1.39a9.322 9.322 0 0 0-1.28-1.727 9.419 9.419 0 0 0-2.623-2.006 9.294 9.294 0 0 0-1.596-.695 9.353 9.353 0 0 0-5.848-.02 9.32 9.32 0 0 0-3.096 1.673 9.387 9.387 0 0 0-2.317 2.755 9.344 9.344 0 0 0-1.053 3.164 9.324 9.324 0 0 0 .088 3.293 9.342 9.342 0 0 0 1.059 2.81 9.39 9.39 0 0 0 1.885 2.297 9.41 9.41 0 0 0 2.508 1.652 9.303 9.303 0 0 0 2.9.786 9.346 9.346 0 0 0 2.948-.096 9.306 9.306 0 0 0 2.679-.923 9.388 9.388 0 0 0 2.996-2.617 9.326 9.326 0 0 0 1.29-1.993l-2.404-1.389z"/>
      <path d="M14.07 10.312a2.362 2.362 0 0 0-2.058-1.2 2.367 2.367 0 0 0-2.059 1.2 2.362 2.362 0 0 0 0 2.376 2.367 2.367 0 0 0 2.059 1.2 2.362 2.362 0 0 0 2.058-1.2 2.36 2.36 0 0 0 0-2.376z"/>
    </svg>
  ),
};

const platforms: SocialPlatform[] = ['instagram', 'youtube', 'twitter', 'facebook', 'calendly'];

export function SocialLinksEditor({ values, onChange, disabled }: SocialLinksEditorProps) {
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleIconClick = (platform: SocialPlatform) => {
    if (activePlatform === platform) {
      // Close if clicking same platform
      setActivePlatform(null);
      setInputValue('');
    } else {
      // Open editor for this platform
      setActivePlatform(platform);
      setInputValue(values[platform] || '');
    }
  };

  const handleSave = () => {
    if (!activePlatform) return;
    
    // Normalize and save
    const normalized = normalizeSocialLink(activePlatform, inputValue);
    onChange(activePlatform, normalized.url);
    setActivePlatform(null);
    setInputValue('');
  };

  const handleClear = () => {
    if (!activePlatform) return;
    onChange(activePlatform, '');
    setActivePlatform(null);
    setInputValue('');
  };

  return (
    <div className="space-y-3">
      {/* Social Icons Bar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/30">
        {platforms.map((platform) => {
          const Icon = SocialIcons[platform];
          const hasValue = !!values[platform];
          const isActive = activePlatform === platform;
          
          return (
            <button
              key={platform}
              type="button"
              onClick={() => handleIconClick(platform)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-all flex-1",
                isActive && "bg-muted/50 ring-1 ring-border/50",
                "text-muted-foreground hover:text-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon />
              {!hasValue && (
                <span className="text-[9px] flex items-center gap-0.5 text-muted-foreground">
                  <Plus className="h-2 w-2" />
                  Add
                </span>
              )}
              {hasValue && (
                <Check className="h-3 w-3 text-green-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Expandable Input */}
      {activePlatform && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border/40 animate-fade-up">
          <label className="text-sm font-medium text-foreground">
            {getSocialLabel(activePlatform)}
          </label>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={getSocialPlaceholder(activePlatform)}
            disabled={disabled}
            className="bg-background"
          />
          
          {/* Show normalized URL preview */}
          {inputValue && (
            <p className="text-xs text-muted-foreground truncate">
              {normalizeSocialLink(activePlatform, inputValue).url || 'Enter a valid link'}
            </p>
          )}
          
          <p className="text-xs text-muted-foreground/70">
            Make sure this link is correct
          </p>
          
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={disabled}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
