import * as React from 'react';
import { cn } from '@/lib/utils';

// Country codes for phone input - no emojis for clean UI
const COUNTRY_CODES = [
  { code: '+91' },
  { code: '+1' },
  { code: '+44' },
  { code: '+61' },
  { code: '+971' },
  { code: '+966' },
  { code: '+65' },
  { code: '+81' },
  { code: '+86' },
  { code: '+49' },
  { code: '+33' },
  { code: '+39' },
  { code: '+34' },
  { code: '+7' },
  { code: '+55' },
  { code: '+52' },
  { code: '+27' },
  { code: '+82' },
  { code: '+60' },
  { code: '+66' },
  { code: '+84' },
  { code: '+62' },
  { code: '+63' },
  { code: '+92' },
  { code: '+880' },
  { code: '+94' },
  { code: '+977' },
  { code: '+64' },
  { code: '+41' },
  { code: '+31' },
  { code: '+46' },
  { code: '+47' },
  { code: '+45' },
  { code: '+358' },
  { code: '+48' },
  { code: '+43' },
  { code: '+32' },
  { code: '+353' },
  { code: '+351' },
  { code: '+30' },
  { code: '+852' },
  { code: '+886' },
  { code: '+90' },
  { code: '+972' },
  { code: '+974' },
  { code: '+968' },
  { code: '+973' },
  { code: '+965' },
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
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

// Floating label input component - CSS-only transitions, no React state during focus
export const FloatingInput = ({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  disabled,
  className,
  inputRef,
  onFocus,
  onBlur,
}: FloatingInputProps) => {
  return (
    <div className={cn("relative h-14", className)}>
      <input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder=" "
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-form-type="other"
        className="peer w-full h-full px-4 pt-4 pb-2 text-base bg-transparent outline-none rounded-xl border border-border focus:border-foreground disabled:opacity-50"
        style={{ fontSize: '16px' }}
      />
      {/* Label uses CSS peer selectors only - no JS state changes during focus */}
      <label
        className="absolute left-4 text-muted-foreground pointer-events-none
          top-0 -translate-y-1/2 text-xs bg-background px-1
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
          peer-focus:top-0 peer-focus:text-xs peer-focus:bg-background peer-focus:px-1"
      >
        {label}
      </label>
    </div>
  );
};

// Helper to split full name into first and last
export const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const trimmed = (fullName || '').trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

// Helper to combine first and last into full name
export const combineNames = (firstName: string, lastName: string): string => {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  return [first, last].filter(Boolean).join(' ');
};

interface FloatingNameInputProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  firstNameRequired?: boolean;
}

// Split name input with First Name and Last Name in a grid
export const FloatingNameInput = ({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  disabled,
  className,
  firstNameRequired = true,
}: FloatingNameInputProps) => {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <FloatingInput
        label={firstNameRequired ? "First Name *" : "First Name"}
        value={firstName}
        onChange={(e) => onFirstNameChange(e.target.value)}
        disabled={disabled}
      />
      <FloatingInput
        label="Last Name"
        value={lastName}
        onChange={(e) => onLastNameChange(e.target.value)}
        disabled={disabled}
      />
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
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

// Phone input with country code selector - STATIC placeholder to prevent keyboard jump
// Phone input with country code selector AND floating label
export const FloatingPhoneInput = ({
  label,
  value,
  onChange,
  countryCode,
  onCountryCodeChange,
  disabled,
  className,
  onFocus,
  onBlur,
}: FloatingPhoneInputProps) => {
  return (
    <div className={cn("relative h-14", className)}>
      {/* Container with border */}
      <div className="peer w-full h-full rounded-xl border border-border focus-within:border-foreground flex items-center">
        {/* Country code selector - compact, no emoji */}
        <div className="flex items-center justify-center pl-3 pr-1 shrink-0 border-r border-border/50 h-full">
          <select
            value={countryCode}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            className="bg-transparent text-sm outline-none cursor-pointer disabled:opacity-50 appearance-none font-medium"
            style={{ fontSize: '14px' }}
          >
            {COUNTRY_CODES.map(({ code }) => (
              <option key={code} value={code} className="bg-background text-foreground">
                {code}
              </option>
            ))}
          </select>
        </div>
        
        {/* Phone input - use inputMode="numeric" to suppress iOS contacts bar */}
        <input
          type="text"
          inputMode="numeric"
          name={`phone-${Date.now()}`}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder=" "
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-form-type="other"
          data-lpignore="true"
          className="peer-phone flex-1 min-w-0 h-full px-3 pt-4 pb-2 text-base bg-transparent outline-none disabled:opacity-50"
          style={{ fontSize: '16px' }}
        />
      </div>
      
      {/* Floating label - animates to border on focus/fill */}
      <label
        className="absolute left-16 text-muted-foreground pointer-events-none
          top-0 -translate-y-1/2 text-xs bg-background px-1
          peer-focus-within:top-0 peer-focus-within:text-xs peer-focus-within:bg-background peer-focus-within:px-1
          peer-has-[:placeholder-shown]:peer-has-[input:not(:focus)]:top-1/2 
          peer-has-[:placeholder-shown]:peer-has-[input:not(:focus)]:text-base 
          peer-has-[:placeholder-shown]:peer-has-[input:not(:focus)]:bg-transparent 
          peer-has-[:placeholder-shown]:peer-has-[input:not(:focus)]:px-0"
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
