'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/utils';

interface GlassBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
}

const GlassBadge = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  ...props
}: GlassBadgeProps) => {
  const variants = {
    default: 'bg-white/20 text-white border-white/30',
    primary: 'bg-primary-500/20 text-primary-100 border-primary-400/30',
    secondary: 'bg-secondary-500/20 text-secondary-100 border-secondary-400/30',
    accent: 'bg-accent-500/20 text-accent-100 border-accent-400/30',
    success: 'bg-green-500/20 text-green-100 border-green-400/30',
    warning: 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30',
    error: 'bg-red-500/20 text-red-100 border-red-400/30'
  };

  const sizes = {
    sm: dot ? 'w-2 h-2' : 'px-2 py-0.5 text-xs',
    md: dot ? 'w-3 h-3' : 'px-2.5 py-1 text-sm',
    lg: dot ? 'w-4 h-4' : 'px-3 py-1.5 text-base'
  };

  if (dot) {
    return (
      <span
        className={cn(
          'inline-block rounded-full backdrop-blur-sm border',
          variants[variant],
          sizes[size],
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full backdrop-blur-sm border',
        variants[variant],
        sizes[size],
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export { GlassBadge };