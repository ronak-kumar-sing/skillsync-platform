'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/utils';

interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({
    className,
    label,
    error,
    helperText,
    options,
    placeholder,
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
          <select
            ref={ref}
            className={cn(
              // Base styles
              'w-full px-4 py-3 rounded-xl transition-all duration-300 appearance-none',
              'bg-white/10 backdrop-blur-md border text-white',
              'focus:outline-none focus:ring-2 focus:ring-primary-400/50',

              // States
              hasError
                ? 'border-red-400/50 focus:border-red-400 focus:ring-red-400/50'
                : 'border-white/20 focus:border-primary-400/50 hover:border-white/30',

              // Disabled state
              'disabled:opacity-50 disabled:cursor-not-allowed',

              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-gray-800 text-white/70">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="bg-gray-800 text-white"
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-white/50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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

GlassSelect.displayName = 'GlassSelect';

export { GlassSelect };