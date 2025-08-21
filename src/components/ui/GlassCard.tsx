'use client';

import React, { forwardRef, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { usePerformance } from './PerformanceProvider';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'light' | 'medium' | 'dark' | 'gradient';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  children: React.ReactNode;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  variant = 'medium',
  blur = 'md',
  interactive = false,
  className,
  children,
  ...props
}, ref) => {
  const { enableAnimations } = usePerformance();

  // Variant styles
  const variantStyles = {
    light: 'bg-white/15 border-white/25',
    medium: 'bg-white/10 border-white/20',
    dark: 'bg-black/15 border-white/10',
    gradient: 'bg-gradient-to-br from-white/20 to-white/5 border-white/25'
  };

  // Blur styles
  const blurStyles = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  const cardVariants = {
    initial: { scale: 1, opacity: 1 },
    hover: { scale: 1.02, opacity: 1 },
    tap: { scale: 0.98 }
  };

  const Component = enableAnimations && interactive ? motion.div : 'div';
  const motionProps = enableAnimations && interactive ? {
    variants: cardVariants,
    initial: 'initial',
    whileHover: 'hover',
    whileTap: 'tap'
  } : {};

  return (
    <Component
      ref={ref}
      className={cn(
        // Base styles
        'relative overflow-hidden rounded-2xl border',
        'shadow-lg shadow-black/10',

        // Variant and blur
        variantStyles[variant],
        blurStyles[blur],

        // Interactive styles
        interactive && [
          'cursor-pointer',
          'transition-all duration-200 ease-out',
          'hover:shadow-xl hover:shadow-black/20'
        ],

        className
      )}
      {...motionProps}
      {...props}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </Component>
  );
});

GlassCard.displayName = 'GlassCard';