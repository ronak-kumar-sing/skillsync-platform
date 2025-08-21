'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { useFocusTrap, useEscapeKey, useClickOutside } from './AccessibilityProvider';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const GlassModal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className
}: GlassModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]'
  };

  // Use accessibility hooks
  useFocusTrap(isOpen);
  useEscapeKey(onClose, isOpen && closeOnEscape);
  useClickOutside(modalRef, onClose, isOpen && closeOnOverlayClick);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('aria-hidden', 'true');
    } else {
      document.body.style.overflow = 'unset';
      document.body.removeAttribute('aria-hidden');
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.removeAttribute('aria-hidden');
    };
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleOverlayClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn('relative w-full', sizes[size])}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
          >
            <GlassCard
              variant="medium"
              blur="lg"
              shadow
              className={cn('p-6', className)}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {title && (
                      <h2 id="modal-title" className="text-xl font-semibold text-white mb-1">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p id="modal-description" className="text-white/70 text-sm">
                        {description}
                      </p>
                    )}
                  </div>

                  {showCloseButton && (
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="ml-4 p-2"
                      aria-label="Close modal"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </GlassButton>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="text-white">
                {children}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export { GlassModal };