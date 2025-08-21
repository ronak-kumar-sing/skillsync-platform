'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/utils';
import { useResponsive } from '@/components/ui/ResponsiveProvider';
import { usePerformance } from '@/components/ui/PerformanceProvider';
import { GlassCard } from '@/components/ui/GlassCard';

interface NavigationItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  isActive?: boolean;
}

interface MobileNavigationProps {
  items: NavigationItem[];
  className?: string;
}

export function MobileNavigation({ items, className }: MobileNavigationProps) {
  const pathname = usePathname();
  const { isMobile, isTablet } = useResponsive();
  const { enableAnimations } = usePerformance();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide navigation on scroll
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      const scrollThreshold = 10;

      if (Math.abs(currentScrollY - lastScrollY) > scrollThreshold) {
        setIsVisible(!scrollingDown || currentScrollY < 100);
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobile]);

  // Don't render on desktop
  if (!isMobile && !isTablet) {
    return null;
  }

  const navigationVariants = {
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    hidden: {
      y: 100,
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  };

  const itemVariants = {
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={enableAnimations ? "hidden" : "visible"}
          animate="visible"
          exit="hidden"
          variants={enableAnimations ? navigationVariants : undefined}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 md:hidden',
            'pb-safe', // Safe area padding for iOS
            className
          )}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <GlassCard
            variant="medium"
            blur="xl"
            className="mx-4 mb-4 rounded-2xl border-white/10"
          >
            <div className="flex items-center justify-around px-2 py-3">
              {items.map((item, index) => {
                const isActive = item.isActive ?? pathname === item.href;

                return (
                  <motion.div
                    key={item.href}
                    variants={enableAnimations ? itemVariants : undefined}
                    whileTap={enableAnimations ? "tap" : undefined}
                    className="relative"
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        'flex flex-col items-center justify-center',
                        'min-w-[60px] py-2 px-3 rounded-xl',
                        'transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-primary-400/50',
                        isActive
                          ? 'bg-primary-500/20 text-primary-300'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      )}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'text-xl mb-1 transition-transform duration-200',
                        isActive && 'scale-110'
                      )}>
                        {item.icon}
                      </div>

                      {/* Label */}
                      <span className="text-xs font-medium leading-none">
                        {item.label}
                      </span>

                      {/* Badge */}
                      {item.badge && item.badge > 0 && (
                        <motion.div
                          initial={enableAnimations ? { scale: 0 } : undefined}
                          animate={enableAnimations ? { scale: 1 } : undefined}
                          className={cn(
                            'absolute -top-1 -right-1',
                            'min-w-[18px] h-[18px] px-1',
                            'bg-red-500 text-white text-xs font-bold',
                            'rounded-full flex items-center justify-center',
                            'border-2 border-black/20'
                          )}
                          aria-label={`${item.badge} notifications`}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </motion.div>
                      )}

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-400 rounded-full"
                          transition={enableAnimations ? { type: 'spring', stiffness: 300, damping: 30 } : undefined}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

// Default navigation items for the platform
export const defaultMobileNavItems: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    href: '/search',
    label: 'Search',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  },
  {
    href: '/sessions',
    label: 'Sessions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    href: '/messages',
    label: 'Messages',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  }
];