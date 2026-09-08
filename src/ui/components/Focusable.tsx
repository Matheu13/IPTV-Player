import React, { useRef, useEffect } from 'react';

interface FocusableProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  isFocused?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  className?: string;
  focusClassName?: string;
  children: React.ReactNode;
}

export const Focusable: React.FC<FocusableProps> = ({
  id,
  isFocused = false,
  onSelect,
  disabled = false,
  className = '',
  focusClassName = '',
  children,
  ...rest
}) => {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && elRef.current) {
      elRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [isFocused]);

  const defaultFocusStyle =
    'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#080b11] shadow-[0_0_24px_rgba(34,197,94,0.5)] scale-[1.02] bg-slate-800/95 text-white';

  return (
    <div
      ref={elRef}
      id={id}
      data-focused={isFocused ? 'true' : undefined}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled && onSelect) onSelect();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onSelect) onSelect();
        }
      }}
      className={`outline-none transition-all duration-200 ease-out cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b11] focus-visible:shadow-[0_0_24px_rgba(34,197,94,0.5)] focus-visible:scale-[1.02] ${className} ${
        isFocused ? (focusClassName || defaultFocusStyle) : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      {...rest}
    >
      {children}
    </div>
  );
};
