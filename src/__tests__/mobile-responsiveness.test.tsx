import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Global mock for window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock utils
vi.mock('@/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { PWAInstallPrompt, usePWAInstall } from '@/components/features/PWAInstallPrompt';
import { ResponsiveProvider, useResponsive } from '@/components/ui/ResponsiveProvider';
import { PerformanceProvider } from '@/components/ui/PerformanceProvider';
import { useTouchGestures, useSwipeGestures } from '@/hooks/useTouchGestures';

// Mock window properties for mobile testing
const mockWindowProperties = (width: number, height: number, touchSupport = true) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  if (touchSupport) {
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: {},
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 1,
    });
  } else {
    // Ensure no touch support for desktop
    if ('ontouchstart' in window) {
      delete (window as any).ontouchstart;
    }
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
  }

  // Update visualViewport for mobile
  if (window.visualViewport) {
    window.visualViewport.width = width;
    window.visualViewport.height = height;
  }
};

// Test component that uses responsive hooks
function TestResponsiveComponent() {
  const { isMobile, isTablet, isDesktop, orientation, isTouchDevice } = useResponsive();

  return (
    <div data-testid="responsive-info">
      <span data-testid="is-mobile">{isMobile.toString()}</span>
      <span data-testid="is-tablet">{isTablet.toString()}</span>
      <span data-testid="is-desktop">{isDesktop.toString()}</span>
      <span data-testid="orientation">{orientation}</span>
      <span data-testid="is-touch">{isTouchDevice.toString()}</span>
    </div>
  );
}

// Test wrapper with all providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PerformanceProvider>
      <ResponsiveProvider>
        {children}
      </ResponsiveProvider>
    </PerformanceProvider>
  );
}

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ResponsiveProvider', () => {
    it('should detect mobile devices correctly', () => {
      mockWindowProperties(375, 667, true); // iPhone dimensions

      render(
        <TestWrapper>
          <TestResponsiveComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
      expect(screen.getByTestId('is-touch')).toHaveTextContent('true');
    });

    it('should detect tablet devices correctly', () => {
      mockWindowProperties(768, 1024, true); // iPad dimensions

      render(
        <TestWrapper>
          <TestResponsiveComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('true');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
    });

    it('should detect desktop devices correctly', () => {
      mockWindowProperties(1920, 1080, false); // Desktop dimensions

      render(
        <TestWrapper>
          <TestResponsiveComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('true');
      expect(screen.getByTestId('is-touch')).toHaveTextContent('false');
    });

    it('should detect orientation changes', () => {
      mockWindowProperties(667, 375, true); // Landscape mobile

      render(
        <TestWrapper>
          <TestResponsiveComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('orientation')).toHaveTextContent('landscape');
    });
  });

  describe('MobileNavigation', () => {
    const mockNavItems = [
      {
        href: '/dashboard',
        label: 'Home',
        icon: <span>🏠</span>,
      },
      {
        href: '/profile',
        label: 'Profile',
        icon: <span>👤</span>,
        badge: 3,
      },
    ];

    it('should render navigation items correctly', () => {
      mockWindowProperties(375, 667, true);

      render(
        <TestWrapper>
          <MobileNavigation items={mockNavItems} />
        </TestWrapper>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Badge
    });

    it('should hide on desktop', () => {
      mockWindowProperties(1920, 1080, false);

      const { container } = render(
        <TestWrapper>
          <MobileNavigation items={mockNavItems} />
        </TestWrapper>
      );

      // On desktop, MobileNavigation should return null
      const nav = container.querySelector('nav');
      expect(nav).toBeNull();
    });

    it('should handle scroll to hide/show navigation', async () => {
      mockWindowProperties(375, 667, true);

      render(
        <TestWrapper>
          <MobileNavigation items={mockNavItems} />
        </TestWrapper>
      );

      // Simulate scroll down
      Object.defineProperty(window, 'scrollY', { value: 200, writable: true });
      fireEvent.scroll(window);

      // Navigation should still be visible initially
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  describe('MobileLayout', () => {
    it('should apply mobile layout on mobile devices', () => {
      mockWindowProperties(375, 667, true);

      render(
        <TestWrapper>
          <MobileLayout>
            <div data-testid="content">Mobile Content</div>
          </MobileLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should not apply mobile layout on desktop', () => {
      mockWindowProperties(1920, 1080, false);

      const { container } = render(
        <TestWrapper>
          <MobileLayout>
            <div data-testid="content">Desktop Content</div>
          </MobileLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      // On desktop, MobileLayout should just render children without mobile wrapper
      expect(container.firstChild).not.toHaveClass('pb-safe');
    });
  });

  describe('Touch Gestures', () => {
    it('should detect swipe gestures', () => {
      const onSwipe = vi.fn();

      function TestSwipeComponent() {
        const { attachListeners } = useTouchGestures({ onSwipe });

        React.useEffect(() => {
          const element = document.getElementById('swipe-area');
          if (element) {
            return attachListeners(element);
          }
        }, [attachListeners]);

        return <div id="swipe-area" data-testid="swipe-area">Swipe me</div>;
      }

      render(<TestSwipeComponent />);

      const swipeArea = screen.getByTestId('swipe-area');

      // Simulate touch events for swipe
      fireEvent.touchStart(swipeArea, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(swipeArea, {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      });

      expect(onSwipe).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'right',
          distance: expect.any(Number),
        })
      );
    });

    it('should detect double tap gestures', async () => {
      const onDoubleTap = vi.fn();

      function TestDoubleTapComponent() {
        const { attachListeners } = useTouchGestures({ onDoubleTap });

        React.useEffect(() => {
          const element = document.getElementById('tap-area');
          if (element) {
            return attachListeners(element);
          }
        }, [attachListeners]);

        return <div id="tap-area" data-testid="tap-area">Double tap me</div>;
      }

      render(<TestDoubleTapComponent />);

      const tapArea = screen.getByTestId('tap-area');

      // First tap
      fireEvent.touchStart(tapArea, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchEnd(tapArea, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      // Second tap (within double tap delay)
      fireEvent.touchStart(tapArea, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchEnd(tapArea, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      expect(onDoubleTap).toHaveBeenCalled();
    });
  });
});

describe('PWA Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear session storage
    sessionStorage.clear();

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe('PWA Install Prompt', () => {
    it('should not show on desktop', () => {
      mockWindowProperties(1920, 1080, false);

      render(
        <TestWrapper>
          <PWAInstallPrompt />
        </TestWrapper>
      );

      expect(screen.queryByText('Install SkillSync')).not.toBeInTheDocument();
    });

    it('should show on mobile when conditions are met', async () => {
      mockWindowProperties(375, 667, true);

      // Mock beforeinstallprompt event
      const mockPromptEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      render(
        <TestWrapper>
          <PWAInstallPrompt />
        </TestWrapper>
      );

      // Simulate beforeinstallprompt event
      fireEvent(window, new CustomEvent('beforeinstallprompt', { detail: mockPromptEvent }));

      // Wait for the prompt to show (after delay)
      await waitFor(() => {
        expect(screen.queryByText('Install SkillSync')).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should handle install button click', async () => {
      mockWindowProperties(375, 667, true);

      const mockPromptEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      render(
        <TestWrapper>
          <PWAInstallPrompt />
        </TestWrapper>
      );

      // Simulate beforeinstallprompt event
      fireEvent(window, new CustomEvent('beforeinstallprompt', { detail: mockPromptEvent }));

      await waitFor(() => {
        expect(screen.getByText('Install SkillSync')).toBeInTheDocument();
      }, { timeout: 4000 });

      const installButton = screen.getByText('Install');
      fireEvent.click(installButton);

      expect(mockPromptEvent.prompt).toHaveBeenCalled();
    });

    it('should dismiss and not show again in session', async () => {
      mockWindowProperties(375, 667, true);

      render(
        <TestWrapper>
          <PWAInstallPrompt />
        </TestWrapper>
      );

      // Simulate beforeinstallprompt event
      fireEvent(window, new CustomEvent('beforeinstallprompt'));

      await waitFor(() => {
        expect(screen.getByText('Install SkillSync')).toBeInTheDocument();
      }, { timeout: 4000 });

      const laterButton = screen.getByText('Later');
      fireEvent.click(laterButton);

      expect(sessionStorage.getItem('pwa-prompt-dismissed')).toBe('true');
    });
  });

  describe('usePWAInstall hook', () => {
    it('should detect installation status', () => {
      // Mock standalone mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      function TestPWAComponent() {
        const { isInstalled, canInstall } = usePWAInstall();

        return (
          <div>
            <span data-testid="is-installed">{isInstalled.toString()}</span>
            <span data-testid="can-install">{canInstall.toString()}</span>
          </div>
        );
      }

      render(<TestPWAComponent />);

      expect(screen.getByTestId('is-installed')).toHaveTextContent('true');
    });
  });
});

describe('Mobile Video Call', () => {
  beforeEach(() => {
    mockWindowProperties(375, 667, true);

    // Mock WebRTC APIs
    global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
      createOffer: vi.fn().mockResolvedValue({}),
      createAnswer: vi.fn().mockResolvedValue({}),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
    }));

    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [],
        getVideoTracks: () => [],
        getAudioTracks: () => [],
      }),
    } as any;
  });

  it('should render mobile video call interface', () => {
    // This would test the MobileVideoCall component
    // Implementation depends on the actual component structure
    expect(true).toBe(true); // Placeholder
  });

  it('should handle orientation changes', () => {
    // Test orientation change handling
    expect(true).toBe(true); // Placeholder
  });

  it('should support touch gestures for video controls', () => {
    // Test touch gesture integration
    expect(true).toBe(true); // Placeholder
  });
});