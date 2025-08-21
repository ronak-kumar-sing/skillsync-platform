'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'search' | 'password';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({
    className,
    label,
    error,
    helperText,
    variant = 'default',
    icon,
    iconPosition = 'left',
    type,
    ...props
  }, ref) => {
    const hasError = !!error;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-white/80">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            type={type || (variant === 'password' ? 'password' : variant === 'search' ? 'search' : 'text')}
            className={cn(
              // Base styles
              'w-full px-4 py-3 rounded-xl transition-all duration-300',
              'bg-white/10 backdrop-blur-md border text-white placeholder-white/50',
              'focus:outline-none focus:ring-2 focus:ring-primary-400/50',

              // Icon padding
              icon && iconPosition === 'left' ? 'pl-10' : '',
              icon && iconPosition === 'right' ? 'pr-10' : '',

              // States
              hasError
                ? 'border-red-400/50 focus:border-red-400 focus:ring-red-400/50'
                : 'border-white/20 focus:border-primary-400/50 hover:border-white/30',

              // Disabled state
              'disabled:opacity-50 disabled:cursor-not-allowed',

              className
            )}
            {...props}
          />

          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50">
              {icon}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p className={cn(
            'text-sm',
            hasError ? 'text-red-400' : 'text-white/60'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export { GlassInput };