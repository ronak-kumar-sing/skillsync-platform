'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { useResponsive } from '@/components/ui/ResponsiveProvider';
import { usePerformance } from '@/components/ui/PerformanceProvider';
import { MobileNavigation, defaultMobileNavItems } from './MobileNavigation';

interface MobileLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
  navigationItems?: Array<{
    href: string;
    label: string;
    icon: ReactNode;
    badge?: number;
    isActive?: boolean;
  }>;
  className?: string;
}

export function MobileLayout({
  children,
  showNavigation = true,
  navigationItems = defaultMobileNavItems,
  className
}: MobileLayoutProps) {
  const { isMobile, isTablet, orientation } = useResponsive();
  const { enableAnimations } = usePerformance();
  const [viewportHeight, setViewportHeight] = useState(0);

  // Handle viewport height changes (especially for mobile browsers)
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use visualViewport if available (better for mobile)
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    updateViewportHeight();

    // Listen for viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      return () => window.visualViewport?.removeEventListener('resize', updateViewportHeight);
    } else {
      window.addEventListener('resize', updateViewportHeight);
      return () => window.removeEventListener('resize', updateViewportHeight);
    }
  }, []);

  // Layout variants for animations
  const layoutVariants = {
    initial: {
      opacity: 0,
      y: 20
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
        ease: 'easeIn'
      }
    }
  };

  // Don't apply mobile layout on desktop
  if (!isMobile && !isTablet) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={enableAnimations ? "initial" : "animate"}
      animate="animate"
      exit="exit"
      variants={enableAnimations ? layoutVariants : undefined}
      className={cn(
        'min-h-screen flex flex-col',
        'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900',
        // Safe area support for iOS
        'pt-safe pl-safe pr-safe',
        showNavigation && 'pb-safe',
        // Orientation-specific styles
        orientation === 'landscape' && isMobile && 'landscape:pt-2',
        className
      )}
      style={{
        minHeight: viewportHeight || '100vh'
      }}
    >
      {/* Main Content Area */}
      <main
        className={cn(
          'flex-1 relative overflow-x-hidden',
          // Add bottom padding when navigation is shown
          showNavigation && 'pb-20',
          // Adjust for landscape orientation
          orientation === 'landscape' && isMobile && 'landscape:pb-16'
        )}
        role="main"
      >
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      {showNavigation && (
        <MobileNavigation
          items={navigationItems}
          className={cn(
            // Adjust position for landscape
            orientation === 'landscape' && isMobile && 'landscape:bottom-2'
          )}
        />
      )}

      {/* Scroll to top button for mobile */}
      <ScrollToTopButton />
    </motion.div>
  );
}

// Scroll to top button component
function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const { enableAnimations } = usePerformance();

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={enableAnimations ? { opacity: 0, scale: 0.8 } : undefined}
          animate={enableAnimations ? { opacity: 1, scale: 1 } : undefined}
          exit={enableAnimations ? { opacity: 0, scale: 0.8 } : undefined}
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-24 right-4 z-40',
            'w-12 h-12 rounded-full',
            'bg-primary-500/20 backdrop-blur-md',
            'border border-primary-400/30',
            'text-primary-300 hover:text-primary-200',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-400/50',
            'shadow-lg shadow-primary-500/20'
          )}
          aria-label="Scroll to top"
        >
          <svg
            className="w-6 h-6 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Mobile-specific layout utilities
export const MobileContainer = ({ children, className }: { children: ReactNode; className?: string }) => {
  const { isMobile } = useResponsive();

  return (
    <div className={cn(
      'w-full max-w-full',
      isMobile ? 'px-4' : 'px-6',
      className
    )}>
      {children}
    </div>
  );
};

export const MobileSection = ({ children, className }: { children: ReactNode; className?: string }) => {
  const { isMobile } = useResponsive();

  return (
    <section className={cn(
      'w-full',
      isMobile ? 'py-4' : 'py-6',
      className
    )}>
      {children}
    </section>
  );
};

// Hook for mobile-specific behavior
export const useMobileLayout = () => {
  const { isMobile, isTablet, orientation } = useResponsive();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        const heightDifference = window.innerHeight - window.visualViewport.height;
        setKeyboardVisible(heightDifference > 150); // Threshold for keyboard detection
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => window.visualViewport?.removeEventListener('resize', handleViewportChange);
    }
  }, [isMobile]);

  return {
    isMobile,
    isTablet,
    orientation,
    keyboardVisible,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait'
  };
};