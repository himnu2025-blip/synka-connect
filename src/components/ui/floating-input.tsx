import * as React from 'react';
import { cn } from '@/lib/utils';

// Country codes for phone input
const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+44', flag: '🇬🇧' },
  { code: '+61', flag: '🇦🇺' },
  { code: '+971', flag: '🇦🇪' },
  { code: '+966', flag: '🇸🇦' },
  { code: '+65', flag: '🇸🇬' },
  { code: '+81', flag: '🇯🇵' },
  { code: '+86', flag: '🇨🇳' },
  { code: '+49', flag: '🇩🇪' },
  { code: '+33', flag: '🇫🇷' },
  { code: '+39', flag: '🇮🇹' },
  { code: '+34', flag: '🇪🇸' },
  { code: '+7', flag: '🇷🇺' },
  { code: '+55', flag: '🇧🇷' },
  { code: '+52', flag: '🇲🇽' },
  { code: '+27', flag: '🇿🇦' },
  { code: '+82', flag: '🇰🇷' },
  { code: '+60', flag: '🇲🇾' },
  { code: '+66', flag: '🇹🇭' },
  { code: '+84', flag: '🇻🇳' },
  { code: '+62', flag: '🇮🇩' },
  { code: '+63', flag: '🇵🇭' },
  { code: '+92', flag: '🇵🇰' },
  { code: '+880', flag: '🇧🇩' },
  { code: '+94', flag: '🇱🇰' },
  { code: '+977', flag: '🇳🇵' },
  { code: '+64', flag: '🇳🇿' },
  { code: '+41', flag: '🇨🇭' },
  { code: '+31', flag: '🇳🇱' },
  { code: '+46', flag: '🇸🇪' },
  { code: '+47', flag: '🇳🇴' },
  { code: '+45', flag: '🇩🇰' },
  { code: '+358', flag: '🇫🇮' },
  { code: '+48', flag: '🇵🇱' },
  { code: '+43', flag: '🇦🇹' },
  { code: '+32', flag: '🇧🇪' },
  { code: '+353', flag: '🇮🇪' },
  { code: '+351', flag: '🇵🇹' },
  { code: '+30', flag: '🇬🇷' },
  { code: '+852', flag: '🇭🇰' },
  { code: '+886', flag: '🇹🇼' },
  { code: '+90', flag: '🇹🇷' },
  { code: '+972', flag: '🇮🇱' },
  { code: '+974', flag: '🇶🇦' },
  { code: '+968', flag: '🇴🇲' },
  { code: '+973', flag: '🇧🇭' },
  { code: '+965', flag: '🇰🇼' },
];

export { COUNTRY_CODES };

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'url';
  disabled?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

// Floating label input component
export const FloatingInput = ({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  disabled,
  className,
  inputRef,
}: FloatingInputProps) => {
  const hasValue = value !== undefined && value !== null && value !== '';
  
  return (
    <div className={cn("relative h-14", className)}>
      <input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        placeholder=" "
        disabled={disabled}
        className="peer w-full h-full px-4 text-base bg-transparent outline-none rounded-xl border border-border focus:border-foreground transition-colors disabled:opacity-50"
        style={{ fontSize: '16px' }}
      />
      <label
        className={cn(
          "absolute left-4 text-muted-foreground pointer-events-none transition-all duration-200",
          hasValue
            ? "top-0 -translate-y-1/2 text-xs bg-background px-1"
            : "top-1/2 -translate-y-1/2 text-base bg-transparent px-0",
          "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:bg-background peer-focus:px-1"
        )}
      >
        {label}
      </label>
    </div>
  );
};

interface FloatingPhoneInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
}

// Floating label input with country code selector
export const FloatingPhoneInput = ({
  label,
  value,
  onChange,
  countryCode,
  onCountryCodeChange,
  disabled,
  className,
}: FloatingPhoneInputProps) => {
  const hasValue = value !== undefined && value !== null && value !== '';
  
  return (
    <div className={cn("relative h-14", className)}>
      <div className="flex items-center h-full rounded-xl border border-border focus-within:border-foreground transition-colors">
        {/* Country code selector - compact */}
        <div className="flex items-center justify-center pl-3 pr-2 shrink-0 border-r border-border/50 h-full">
          <select
            value={countryCode}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            disabled={disabled}
            className="bg-transparent text-sm outline-none cursor-pointer disabled:opacity-50 appearance-none"
            style={{ fontSize: '14px' }}
          >
            {COUNTRY_CODES.map(({ code, flag }) => (
              <option key={code} value={code} className="bg-background text-foreground">{flag} {code}</option>
            ))}
          </select>
        </div>
        {/* Phone input - vertically centered */}
        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={onChange}
          placeholder=" "
          disabled={disabled}
          className="peer flex-1 min-w-0 h-full px-3 text-base bg-transparent outline-none disabled:opacity-50"
          style={{ fontSize: '16px' }}
        />
      </div>
      {/* Floating label - stable positioning with hasValue check */}
      <label
        className={cn(
          "absolute left-3 text-muted-foreground pointer-events-none transition-all duration-200",
          hasValue
            ? "top-0 -translate-y-1/2 text-xs bg-background px-1"
            : "left-[5.5rem] top-1/2 -translate-y-1/2 text-base bg-transparent px-0"
        )}
      >
        {label}
      </label>
    </div>
  );
};

// Helper to extract phone number without country code
export const extractPhoneNumber = (fullPhone: string | undefined | null): string => {
  if (!fullPhone) return '';
  const matchedCode = COUNTRY_CODES.find(c => fullPhone.startsWith(c.code));
  return matchedCode ? fullPhone.slice(matchedCode.code.length) : fullPhone;
};

// Helper to get country code from phone number
export const getCountryCode = (fullPhone: string | undefined | null): string => {
  if (!fullPhone) return '+91';
  const matchedCode = COUNTRY_CODES.find(c => fullPhone.startsWith(c.code));
  return matchedCode?.code || '+91';
};
