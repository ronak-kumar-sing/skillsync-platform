'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { useAccessibility, useClickOutside, useEscapeKey } from './AccessibilityProvider';
import { useResponsive } from './ResponsiveProvider';

interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  external?: boolean;
}

interface GlassNavigationProps {
  items: NavigationItem[];
  logo?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'horizontal' | 'vertical' | 'floating';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  onItemClick?: (item: NavigationItem) => void;
}

const GlassNavigation = ({
  items,
  logo,
  actions,
  variant = 'horizontal',
  position = 'top',
  className,
  onItemClick
}: GlassNavigationProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet } = useResponsive();
  const { reducedMotion } = useAccessibility();

  // Close mobile menu when clicking outside or pressing escape
  useClickOutside(menuRef, () => setIsMobileMenuOpen(false), isMobileMenuOpen);
  useEscapeKey(() => setIsMobileMenuOpen(false), isMobileMenuOpen);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.disabled) return;

    setIsMobileMenuOpen(false);
    onItemClick?.(item);
  };

  const renderNavigationItem = (item: NavigationItem, mobile = false) => {
    const active = isActive(item.href);

    const itemContent = (
      <div
        className={cn(
          'flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200',
          mobile ? 'w-full' : '',
          active
            ? 'bg-white/20 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/10',
          item.disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {item.icon && (
          <span className="flex-shrink-0">
            {item.icon}
          </span>
        )}
        <span className={cn('font-medium', mobile ? 'text-base' : 'text-sm')}>
          {item.label}
        </span>
        {item.badge && (
          <span className="ml-auto bg-accent-500 text-white text-xs rounded-full px-2 py-1">
            {item.badge}
          </span>
        )}
      </div>
    );

    if (item.disabled) {
      return (
        <div key={item.href} className="cursor-not-allowed">
          {itemContent}
        </div>
      );
    }

    if (item.external) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleItemClick(item)}
        >
          {itemContent}
        </a>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => handleItemClick(item)}
      >
        {itemContent}
      </Link>
    );
  };

  // Mobile/Tablet Navigation
  if (isMobile || isTablet) {
    return (
      <div className={cn('relative z-50', className)}>
        {/* Mobile Header */}
        <GlassCard
          variant="medium"
          blur="lg"
          className="fixed top-0 left-0 right-0 px-4 py-3 rounded-none border-b border-white/20"
        >
          <div className="flex items-center justify-between">
            {logo && (
              <div className="flex items-center">
                {logo}
              </div>
            )}

            <div className="flex items-center space-x-3">
              {actions}

              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
                aria-label="Toggle navigation menu"
              >
                <motion.div
                  animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                    />
                  </svg>
                </motion.div>
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              className="fixed top-16 left-0 right-0 z-40"
            >
              <GlassCard
                variant="medium"
                blur="lg"
                className="mx-4 p-4 rounded-2xl border border-white/20"
              >
                <nav className="space-y-2">
                  {items.map(item => renderNavigationItem(item, true))}
                </nav>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop Navigation
  if (variant === 'horizontal') {
    const positionClasses = {
      top: 'fixed top-4 left-1/2 transform -translate-x-1/2',
      bottom: 'fixed bottom-4 left-1/2 transform -translate-x-1/2'
    };

    return (
      <nav className={cn('z-40', positionClasses[position as 'top' | 'bottom'], className)}>
        <GlassCard
          variant="medium"
          blur="lg"
          className="px-6 py-3"
        >
          <div className="flex items-center space-x-6">
            {logo && (
              <div className="flex items-center">
                {logo}
              </div>
            )}

            <div className="flex items-center space-x-4">
              {items.map(item => renderNavigationItem(item))}
            </div>

            {actions && (
              <div className="flex items-center space-x-3">
                {actions}
              </div>
            )}
          </div>
        </GlassCard>
      </nav>
    );
  }

  if (variant === 'vertical') {
    const positionClasses = {
      left: 'fixed left-4 top-1/2 transform -translate-y-1/2',
      right: 'fixed right-4 top-1/2 transform -translate-y-1/2'
    };

    return (
      <nav className={cn('z-40', positionClasses[position as 'left' | 'right'], className)}>
        <GlassCard
          variant="medium"
          blur="lg"
          className="p-4 w-64"
        >
          {logo && (
            <div className="mb-6 pb-4 border-b border-white/20">
              {logo}
            </div>
          )}

          <div className="space-y-2">
            {items.map(item => renderNavigationItem(item))}
          </div>

          {actions && (
            <div className="mt-6 pt-4 border-t border-white/20">
              {actions}
            </div>
          )}
        </GlassCard>
      </nav>
    );
  }

  // Floating variant
  return (
    <nav className={cn('fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40', className)}>
      <GlassCard
        variant="medium"
        blur="lg"
        className="px-4 py-2"
      >
        <div className="flex items-center space-x-2">
          {items.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'p-3 rounded-lg transition-all duration-200',
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
                title={item.label}
              >
                {item.icon}
              </Link>
            );
          })}
        </div>
      </GlassCard>
    </nav>
  );
};

export { GlassNavigation };
export type { NavigationItem };