'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { useResponsive } from '@/components/ui/ResponsiveProvider';
import { usePerformance } from '@/components/ui/PerformanceProvider';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstalled: boolean;
  canInstall: boolean;
  isStandalone: boolean;
  promptEvent: BeforeInstallPromptEvent | null;
}

export function usePWAInstall() {
  const [state, setState] = useState<PWAInstallState>({
    isInstalled: false,
    canInstall: false,
    isStandalone: false,
    promptEvent: null
  });

  // Check if app is already installed
  const checkInstallation = useCallback(() => {
    if (typeof window === 'undefined') return;

    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isInstalled = isStandaloneMode || isIOSStandalone;

    setState(prev => ({
      ...prev,
      isInstalled,
      isStandalone: isStandaloneMode
    }));
  }, []);

  useEffect(() => {
    checkInstallation();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;

      setState(prev => ({
        ...prev,
        canInstall: true,
        promptEvent
      }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        promptEvent: null
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkInstallation]);

  const install = useCallback(async () => {
    if (!state.promptEvent) return false;

    try {
      await state.promptEvent.prompt();
      const choiceResult = await state.promptEvent.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          canInstall: false,
          promptEvent: null
        }));
        return true;
      }
    } catch (error) {
      console.error('PWA install error:', error);
    }

    return false;
  }, [state.promptEvent]);

  return {
    ...state,
    install
  };
}

interface PWAInstallPromptProps {
  className?: string;
  autoShow?: boolean;
  showDelay?: number;
}

export function PWAInstallPrompt({
  className,
  autoShow = true,
  showDelay = 3000
}: PWAInstallPromptProps) {
  const { isMobile, isTablet } = useResponsive();
  const { enableAnimations } = usePerformance();
  const { isInstalled, canInstall, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if prompt was dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
    setIsDismissed(dismissed === 'true');
  }, []);

  // Auto-show prompt after delay
  useEffect(() => {
    if (!autoShow || isInstalled || isDismissed || !canInstall) return;
    if (!isMobile && !isTablet) return; // Only show on mobile/tablet

    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, showDelay);

    return () => clearTimeout(timer);
  }, [autoShow, showDelay, isInstalled, isDismissed, canInstall, isMobile, isTablet]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleLater = () => {
    setShowPrompt(false);
    // Don't mark as permanently dismissed, just hide for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed, can't install, or on desktop
  if (isInstalled || !canInstall || (!isMobile && !isTablet)) {
    return null;
  }

  const promptVariants = {
    hidden: {
      opacity: 0,
      y: 100,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      y: 100,
      scale: 0.9,
      transition: {
        duration: 0.2,
        ease: 'easeIn'
      }
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />

          {/* Install Prompt */}
          <motion.div
            initial={enableAnimations ? "hidden" : "visible"}
            animate="visible"
            exit="exit"
            variants={enableAnimations ? promptVariants : undefined}
            className={cn(
              'fixed bottom-4 left-4 right-4 z-50',
              'max-w-sm mx-auto',
              className
            )}
          >
            <GlassCard variant="medium" blur="xl" className="p-6">
              <div className="flex items-start gap-4">
                {/* App Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Install SkillSync
                  </h3>
                  <p className="text-sm text-white/70 mb-4">
                    Add SkillSync to your home screen for quick access and a better experience.
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={handleInstall}
                      className="flex-1"
                    >
                      Install
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={handleLater}
                      className="flex-1"
                    >
                      Later
                    </GlassButton>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleDismiss}
                  className={cn(
                    'flex-shrink-0 p-1 rounded-lg',
                    'text-white/50 hover:text-white/80',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary-400/50'
                  )}
                  aria-label="Dismiss install prompt"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Features List */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Works offline
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Fast loading
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Push notifications
                  </li>
                </ul>
              </div>
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Manual install button component
export function PWAInstallButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
}) {
  const { canInstall, install } = usePWAInstall();

  if (!canInstall) return null;

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await install();
    props.onClick?.(e);
  };

  return (
    <GlassButton
      {...props}
      onClick={handleClick}
      className={cn('flex items-center gap-2', className)}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      {children || 'Install App'}
    </GlassButton>
  );
}