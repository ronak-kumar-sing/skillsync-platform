'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { Navigation } from './Navigation';
import { Sidebar } from './Sidebar';
import { NavigationBreadcrumbs } from './NavigationBreadcrumbs';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useResponsive } from '@/components/ui/ResponsiveProvider';
import { useAccessibility } from '@/components/ui/AccessibilityProvider';
import { HoverScale, MagneticButton, pageTransition } from '@/components/ui';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showNavigation?: boolean;
  showBreadcrumbs?: boolean;
  className?: string;
}

const AppLayout = ({
  children,
  showSidebar = true,
  showNavigation = true,
  showBreadcrumbs = true,
  className
}: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isMobile, isTablet } = useResponsive();
  const { reducedMotion } = useAccessibility();

  // Handle responsive behavior
  useEffect(() => {
    // Auto-close sidebar on mobile when screen size changes
    if ((isMobile || isTablet) && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [isMobile, isTablet, isSidebarOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with Cmd/Ctrl + B
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }

      // Close sidebar with Escape
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className={cn('min-h-screen relative', className)}>
      {/* Enhanced Background with glassmorphism effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary-900/30 via-secondary-900/20 to-accent-900/30">
        {/* Animated background elements */}
        {!reducedMotion && (
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-primary-500/20 to-transparent rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                rotate: [360, 180, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-secondary-500/20 to-transparent rounded-full blur-3xl"
            />
            {/* Additional floating elements */}
            <motion.div
              animate={{
                x: [0, 100, 0],
                y: [0, -50, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-2xl"
            />
            <motion.div
              animate={{
                x: [0, -80, 0],
                y: [0, 60, 0],
                scale: [1, 0.9, 1],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-primary-500/15 rounded-full blur-2xl"
            />
          </div>
        )}

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
      </div>

      {/* Navigation */}
      {showNavigation && (
        <ErrorBoundary>
          <Navigation />
        </ErrorBoundary>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 flex">
        {/* Sidebar */}
        {showSidebar && (
          <ErrorBoundary>
            <Sidebar
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                'transition-all duration-300',
                !isMobile && isSidebarOpen && 'lg:w-80'
              )}
            />
          </ErrorBoundary>
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 transition-all duration-300',
            showNavigation && 'pt-20 lg:pt-24',
            showSidebar && !isMobile && !isTablet && isSidebarOpen && 'lg:ml-80',
            'px-4 pb-4'
          )}
        >
          <ErrorBoundary>
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Breadcrumbs */}
              {showBreadcrumbs && showNavigation && (
                <NavigationBreadcrumbs className="mt-4" />
              )}

              {/* Page Content */}
              <motion.div
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {children}
              </motion.div>
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3">
        {/* Theme Toggle */}
        <ErrorBoundary>
          <MagneticButton>
            <ThemeToggle variant="button" />
          </MagneticButton>
        </ErrorBoundary>

        {/* Sidebar Toggle (Mobile/Tablet) */}
        {showSidebar && (isMobile || isTablet) && (
          <MagneticButton>
            <HoverScale>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white shadow-glass hover:bg-white/30 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>
            </HoverScale>
          </MagneticButton>
        )}

        {/* Scroll to Top */}
        <ScrollToTopButton />
      </div>

      {/* Loading Overlay (if needed) */}
      <AnimatePresence>
        {/* This can be controlled by a global loading state */}
      </AnimatePresence>
    </div>
  );
};

// Scroll to Top Button Component
const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
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
        <MagneticButton>
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white shadow-glass hover:bg-white/30 transition-all duration-200"
            title="Scroll to top"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </motion.button>
        </MagneticButton>
      )}
    </AnimatePresence>
  );
};

export { AppLayout };