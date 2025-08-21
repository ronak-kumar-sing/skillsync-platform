'use client';

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { usePerformance } from './PerformanceProvider';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  children: React.ReactNode;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(({
  variant = 'primary',
  size = 'md',
  blur = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  const { enableAnimations } = usePerformance();

  // Variant styles
  const variantStyles = {
    primary: 'bg-primary-500/20 border-primary-400/30 text-primary-300 hover:bg-primary-500/30 hover:border-primary-400/50',
    secondary: 'bg-secondary-500/20 border-secondary-400/30 text-secondary-300 hover:bg-secondary-500/30 hover:border-secondary-400/50',
    ghost: 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30',
    danger: 'bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30 hover:border-red-400/50'
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  // Blur styles
  const blurStyles = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  };

  const Component = enableAnimations ? motion.button : 'button';
  const motionProps = enableAnimations ? {
    variants: buttonVariants,
    initial: 'initial',
    whileHover: 'hover',
    whileTap: 'tap'
  } : {};

  return (
    <Component
      ref={ref}
      className={cn(
        // Base styles
        'relative inline-flex items-center justify-center',
        'font-medium rounded-xl border',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-400/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        // Variant and size
        variantStyles[variant],
        sizeStyles[size],
        blurStyles[blur],

        // Loading state
        loading && 'cursor-wait',

        className
      )}
      disabled={disabled || loading}
      {...motionProps}
      {...props}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </div>
    </Component>
  );
});

GlassButton.displayName = 'GlassButton';