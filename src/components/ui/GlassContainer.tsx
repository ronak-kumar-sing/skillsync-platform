'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { usePerformance } from './PerformanceProvider';
import { useAccessibility } from './AccessibilityProvider';

interface GlassContainerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'page' | 'section' | 'card' | 'sidebar' | 'modal';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  center?: boolean;
  animated?: boolean;
  blur?: boolean;
}

const GlassContainer = forwardRef<HTMLDivElement, GlassContainerProps>(
  ({
    className,
    variant = 'section',
    padding = 'md',
    maxWidth = 'full',
    center = false,
    animated = true,
    blur = true,
    children,
    ...props
  }, ref) => {
    const { enableBlur, enableAnimations } = usePerformance();
    const { reducedMotion } = useAccessibility();

    const variants = {
      page: 'min-h-screen bg-gradient-to-br from-primary-900/20 via-secondary-900/20 to-accent-900/20',
      section: 'bg-white/5 border border-white/10 rounded-2xl',
      card: 'bg-white/10 border border-white/20 rounded-xl shadow-glass',
      sidebar: 'bg-white/10 border-r border-white/20 backdrop-blur-lg',
      modal: 'bg-white/20 border border-white/30 rounded-2xl shadow-glass-xl'
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-12'
    };

    const maxWidths = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '4xl': 'max-w-4xl',
      '6xl': 'max-w-6xl',
      full: 'max-w-full'
    };

    const shouldAnimate = animated && enableAnimations && !reducedMotion;

    const containerContent = (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          // Variant styles
          variants[variant],
          // Blur effect
          blur && enableBlur && 'backdrop-blur-md',
          // Padding
          paddings[padding],
          // Max width
          maxWidths[maxWidth],
          // Center
          center && 'mx-auto',
          // Transitions
          !shouldAnimate && 'transition-colors duration-200',
          // Custom className
          className
        )}
        {...props}
      >
        {children}
      </div>
    );

    if (shouldAnimate) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {containerContent}
        </motion.div>
      );
    }

    return containerContent;
  }
);

GlassContainer.displayName = 'GlassContainer';

export { GlassContainer };