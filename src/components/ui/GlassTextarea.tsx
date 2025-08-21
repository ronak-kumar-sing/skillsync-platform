'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils';

interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({
    className,
    label,
    error,
    helperText,
    resize = 'vertical',
    ...props
  }, ref) => {
    const hasError = !!error;

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-white/80">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          className={cn(
            // Base styles
            'w-full px-4 py-3 rounded-xl transition-all duration-300',
            'bg-white/10 backdrop-blur-md border text-white placeholder-white/50',
            'focus:outline-none focus:ring-2 focus:ring-primary-400/50',
            'min-h-[100px]',

            // Resize behavior
            resizeClasses[resize],

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

GlassTextarea.displayName = 'GlassTextarea';

export { GlassTextarea };