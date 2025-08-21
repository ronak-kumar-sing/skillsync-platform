'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { AccessibilityProvider } from '@/components/ui/AccessibilityProvider';
import { ResponsiveProvider } from '@/components/ui/ResponsiveProvider';
import { PerformanceProvider } from '@/components/ui/PerformanceProvider';
import { ToastProvider } from '@/components/ui/GlassToast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="skillsync-theme">
        <PerformanceProvider>
          <AccessibilityProvider>
            <ResponsiveProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ResponsiveProvider>
          </AccessibilityProvider>
        </PerformanceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}