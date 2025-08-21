'use client';

import React, { ReactNode, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { useResponsive } from './ResponsiveProvider';
import { usePerformance } from './PerformanceProvider';

interface MobileGlassCardProps {
  children: ReactNode;
  variant?: 'light' | 'medium' | 'dark' | 'gradient';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  interactive?: boolean;
  touchOptimized?: boolean;
  fullWidth?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shadow?: boolean;
  border?: boolean;
  onClick?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

export const MobileGlassCard = forwardRef<HTMLDivElement, MobileGlassCardProps>(({
  children,
  variant = 'medium',
  blur = 'md',
  className,
  interactive = false,
  touchOptimized = true,
  fullWidth = false,
  padding = 'md',
  rounded = 'lg',
  shadow = true,
  border = true,
  onClick,
  onTouchStart,
  onTouchEnd,
  ...props
}, ref) => {
  const { isMobile, isTablet, isTouchDevice } = useResponsive();
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

  // Padding styles
  const paddingStyles = {
    none: '',
    sm: isMobile ? 'p-3' : 'p-4',
    md: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-6' : 'p-8'
  };

  // Rounded styles
  const roundedStyles = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    '2xl': 'rounded-4xl'
  };

  // Touch-optimized styles
  const touchStyles = touchOptimized && isTouchDevice ? {
    minHeight: '44px', // iOS minimum touch target
    minWidth: '44px'
  } : {};

  // Interactive styles
  const interactiveClasses = interactive ? [
    'cursor-pointer',
    'transition-all duration-200 ease-out',
    'hover:bg-white/15 hover:border-white/30',
    'active:scale-[0.98] active:bg-white/20',
    touchOptimized && 'touch-manipulation',
    // Enhanced touch feedback for mobile
    isMobile && [
      'active:shadow-lg',
      'active:shadow-primary-500/20'
    ]
  ].filter(Boolean).flat() : [];

  // Animation variants
  const cardVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30
      }
    }
  };

  const Component = enableAnimations && interactive ? motion.div : 'div';
  const motionProps = enableAnimations && interactive ? {
    variants: cardVariants,
    initial: 'initial',
    animate: 'animate',
    whileTap: 'tap'
  } : {};

  return (
    <Component
      ref={ref}
      className={cn(
        // Base styles
        'relative overflow-hidden',

        // Variant and blur
        variantStyles[variant],
        blurStyles[blur],

        // Border and shadow
        border && 'border',
        shadow && [
          'shadow-lg',
          isMobile ? 'shadow-black/20' : 'shadow-black/10'
        ],

        // Sizing
        fullWidth && 'w-full',
        paddingStyles[padding],
        roundedStyles[rounded],

        // Interactive styles
        ...interactiveClasses,

        // Mobile-specific optimizations
        isMobile && [
          'select-none', // Prevent text selection on mobile
          'tap-highlight-transparent', // Remove tap highlight
          '-webkit-tap-highlight-color: transparent'
        ],

        className
      )}
      style={touchStyles}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      {...motionProps}
      {...props}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Ripple effect for touch feedback */}
      {interactive && touchOptimized && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-200 group-active:opacity-100" />
        </div>
      )}
    </Component>
  );
});

MobileGlassCard.displayName = 'MobileGlassCard';

// Specialized mobile card variants
export const MobileTouchCard = forwardRef<HTMLDivElement, Omit<MobileGlassCardProps, 'touchOptimized' | 'interactive'>>(
  (props, ref) => (
    <MobileGlassCard
      ref={ref}
      touchOptimized={true}
      interactive={true}
      {...props}
    />
  )
);

MobileTouchCard.displayName = 'MobileTouchCard';

export const MobileListCard = forwardRef<HTMLDivElement, MobileGlassCardProps>(
  ({ className, ...props }, ref) => {
    const { isMobile } = useResponsive();

    return (
      <MobileGlassCard
        ref={ref}
        className={cn(
          'w-full',
          isMobile ? 'rounded-lg' : 'rounded-xl',
          className
        )}
        padding={isMobile ? 'sm' : 'md'}
        {...props}
      />
    );
  }
);

MobileListCard.displayName = 'MobileListCard';

export const MobileActionCard = forwardRef<HTMLDivElement, MobileGlassCardProps>(
  ({ className, ...props }, ref) => {
    const { isMobile } = useResponsive();

    return (
      <MobileTouchCard
        ref={ref}
        className={cn(
          'group',
          isMobile && 'min-h-[60px]', // Ensure touch target size
          className
        )}
        variant="gradient"
        shadow={true}
        {...props}
      />
    );
  }
);

MobileActionCard.displayName = 'MobileActionCard';

// Hook for mobile card interactions
export const useMobileCardGestures = ({
  onTap,
  onDoubleTap,
  onLongPress,
  onSwipe
}: {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
} = {}) => {
  const { isTouchDevice } = useResponsive();

  // Only enable gestures on touch devices
  if (!isTouchDevice) {
    return {
      onTouchStart: undefined,
      onTouchEnd: undefined,
      onTouchMove: undefined
    };
  }

  // Implementation would use the touch gestures hook
  // This is a simplified version for the mobile card context
  return {
    onTouchStart: (e: React.TouchEvent) => {
      // Touch start logic
    },
    onTouchEnd: (e: React.TouchEvent) => {
      // Touch end logic with gesture detection
      onTap?.();
    },
    onTouchMove: (e: React.TouchEvent) => {
      // Touch move logic for swipe detection
    }
  };
};