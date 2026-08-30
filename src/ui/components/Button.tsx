import React from 'react';
import { Focusable } from './Focusable';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isFocused?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  id,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isFocused = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  onClick,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-semibold shadow-md shadow-sky-500/20 border border-sky-400/40',
    secondary:
      'bg-[#1e293b] hover:bg-slate-700 active:bg-slate-800 text-slate-100 font-medium border border-white/10 shadow-sm',
    ghost:
      'bg-transparent hover:bg-white/5 active:bg-white/10 text-slate-300 hover:text-white border border-transparent',
    outline:
      'bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 hover:border-slate-500',
    danger:
      'bg-rose-600/90 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold shadow-md shadow-rose-900/30 border border-rose-500/30',
  }[variant];

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
  }[size];

  const disabledStyles = disabled || isLoading
    ? 'opacity-40 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';

  return (
    <Focusable
      id={id ? `${id}-focus` : undefined}
      isFocused={isFocused}
      disabled={disabled || isLoading}
      onSelect={() => {
        if (!disabled && !isLoading && onClick) {
          onClick({} as any);
        }
      }}
      className="inline-block"
    >
      <button
        id={id}
        disabled={disabled || isLoading}
        onClick={onClick}
        className={`inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 select-none ${variantStyles} ${sizeStyles} ${disabledStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon}
      </button>
    </Focusable>
  );
};
