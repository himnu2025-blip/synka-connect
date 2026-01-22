import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: { logo: 'h-5', text: 'text-lg', gap: 'gap-2' },
  md: { logo: 'h-5', text: 'text-xl', gap: 'gap-2' },
  lg: { logo: 'h-6', text: 'text-2xl', gap: 'gap-2' },
};

export function BrandLogo({ size = 'md', asLink = true, className }: BrandLogoProps) {
  const { logo, text, gap } = sizeClasses[size];

  const content = (
    <div className={cn('flex items-center', gap, className)}>
      <img
        src="/logos/synka-logo.png"
        alt="SYNKA"
        className={cn(logo, 'w-auto object-contain')}
        loading="eager"
        decoding="async"
      />
      <span className={cn('font-anta font-bold gradient-text', text)}>
        SYNKA
      </span>
    </div>
  );

  if (asLink) {
    return <Link to="/">{content}</Link>;
  }

  return content;
}
