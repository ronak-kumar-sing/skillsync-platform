# SkillSync Component Documentation

## Overview

This document provides comprehensive documentation for all React components in the SkillSync platform, including usage examples, props, and best practices.

## Table of Contents

1. [UI Components](#ui-components)
2. [Layout Components](#layout-components)
3. [Feature Components](#feature-components)
4. [Form Components](#form-components)
5. [Animation Components](#animation-components)
6. [Hooks](#hooks)
7. [Best Practices](#best-practices)

## UI Components

### GlassCard

A glassmorphism-styled card component with backdrop blur effects.

```tsx
import { GlassCard } from '@/components/ui';

<GlassCard
  variant="medium"
  blur="lg"
  hover
  className="p-6"
>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</GlassCard>
```

**Props:**
- `variant?: 'light' | 'medium' | 'dark'` - Glass opacity level
- `blur?: 'sm' | 'md' | 'lg' | 'xl'` - Backdrop blur intensity
- `hover?: boolean` - Enable hover effects
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Card content

### GlassButton

A glassmorphism-styled button with various variants and animations.

```tsx
import { GlassButton } from '@/components/ui';

<GlassButton
  variant="primary"
  size="lg"
  onClick={handleClick}
  disabled={isLoading}
>
  Click Me
</GlassButton>
```

**Props:**
- `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'` - Button style
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `disabled?: boolean` - Disable button
- `loading?: boolean` - Show loading state
- `onClick?: () => void` - Click handler
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Button content

### GlassModal

A modal component with glassmorphism styling and animations.

```tsx
import { GlassModal } from '@/components/ui';

<GlassModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Modal Title"
  size="md"
>
  <p>Modal content goes here</p>
</GlassModal>
```

**Props:**
- `isOpen: boolean` - Modal visibility state
- `onClose: () => void` - Close handler
- `title?: string` - Modal title
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Modal size
- `closeOnOverlay?: boolean` - Close when clicking overlay
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Modal content

### GlassInput

A glassmorphism-styled input component with validation support.

```tsx
import { GlassInput } from '@/components/ui';

<GlassInput
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  required
/>
```

**Props:**
- `label?: string` - Input label
- `type?: string` - Input type
- `value?: string` - Input value
- `onChange?: (e: ChangeEvent<HTMLInputElement>) => void` - Change handler
- `error?: string` - Error message
- `required?: boolean` - Required field
- `disabled?: boolean` - Disable input
- `placeholder?: string` - Placeholder text
- `className?: string` - Additional CSS classes

### LoadingSkeleton

Skeleton loading components for better UX during data loading.

```tsx
import { LoadingSkeleton, SkeletonCard } from '@/components/ui';

// Basic skeleton
<LoadingSkeleton className="h-4 w-32" />

// Pre-built skeleton components
<SkeletonCard />
<SkeletonProfile />
<SkeletonDashboard />
```

**Props:**
- `className?: string` - CSS classes for dimensions
- `animate?: boolean` - Enable animation (default: true)

## Layout Components

### AppLayout

The main application layout wrapper with navigation and sidebar.

```tsx
import { AppLayout } from '@/components/layout';

<AppLayout
  showSidebar={true}
  showNavigation={true}
  showBreadcrumbs={true}
>
  <YourPageContent />
</AppLayout>
```

**Props:**
- `showSidebar?: boolean` - Show/hide sidebar (default: true)
- `showNavigation?: boolean` - Show/hide navigation (default: true)
- `showBreadcrumbs?: boolean` - Show/hide breadcrumbs (default: true)
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Page content

### Navigation

The main navigation component with responsive design.

```tsx
import { Navigation } from '@/components/layout';

<Navigation className="custom-nav-styles" />
```

**Features:**
- Responsive design (desktop/mobile)
- Active route highlighting
- User menu integration
- Badge support for notifications

### Sidebar

Collapsible sidebar with navigation links and user information.

```tsx
import { Sidebar } from '@/components/layout';

<Sidebar
  isOpen={sidebarOpen}
  onToggle={() => setSidebarOpen(!sidebarOpen)}
/>
```

**Props:**
- `isOpen: boolean` - Sidebar visibility state
- `onToggle: () => void` - Toggle handler
- `className?: string` - Additional CSS classes

## Feature Components

### VideoCallComponent

Main video calling interface with WebRTC integration.

```tsx
import { VideoCallComponent } from '@/components/features';

<VideoCallComponent
  sessionId="session-uuid"
  onCallEnd={handleCallEnd}
  onError={handleError}
/>
```

**Props:**
- `sessionId: string` - Unique session identifier
- `onCallEnd?: () => void` - Call end handler
- `onError?: (error: Error) => void` - Error handler
- `autoStart?: boolean` - Auto-start call (default: false)

### DashboardOverview

Dashboard overview component with key metrics.

```tsx
import { DashboardOverview } from '@/components/features';

<DashboardOverview
  userId="user-uuid"
  refreshInterval={30000}
/>
```

**Props:**
- `userId?: string` - User ID for personalized data
- `refreshInterval?: number` - Auto-refresh interval in ms
- `showRealTime?: boolean` - Show real-time updates

### UserProgressTracker

Component for tracking and displaying user learning progress.

```tsx
import { UserProgressTracker } from '@/components/features';

<UserProgressTracker
  userId="user-uuid"
  timeframe="month"
  showGoals={true}
/>
```

**Props:**
- `userId?: string` - User ID
- `timeframe?: 'week' | 'month' | 'year'` - Progress timeframe
- `showGoals?: boolean` - Display learning goals
- `interactive?: boolean` - Enable interactive features

### SessionHistory

Component for displaying user's session history.

```tsx
import { SessionHistory } from '@/components/features';

<SessionHistory
  limit={10}
  showFilters={true}
  onSessionClick={handleSessionClick}
/>
```

**Props:**
- `limit?: number` - Number of sessions to display
- `showFilters?: boolean` - Show filter controls
- `onSessionClick?: (session: Session) => void` - Session click handler

## Animation Components

### MicroInteractions

Collection of micro-interaction components for enhanced UX.

```tsx
import {
  HoverScale,
  MagneticButton,
  RippleEffect,
  Floating,
  RevealOnScroll
} from '@/components/ui';

// Hover scale effect
<HoverScale scale={1.05}>
  <button>Hover me</button>
</HoverScale>

// Magnetic button effect
<MagneticButton strength={0.3}>
  <button>Magnetic button</button>
</MagneticButton>

// Ripple effect on click
<RippleEffect color="rgba(255,255,255,0.3)">
  <button>Click for ripple</button>
</RippleEffect>

// Floating animation
<Floating duration={3} intensity={10}>
  <div>Floating element</div>
</Floating>

// Reveal on scroll
<RevealOnScroll direction="up" distance={50}>
  <div>Revealed content</div>
</RevealOnScroll>
```

### StaggerContainer & StaggerItem

Components for creating staggered animations.

```tsx
import { StaggerContainer, StaggerItem } from '@/components/ui';

<StaggerContainer staggerDelay={0.1}>
  <StaggerItem>
    <div>Item 1</div>
  </StaggerItem>
  <StaggerItem>
    <div>Item 2</div>
  </StaggerItem>
  <StaggerItem>
    <div>Item 3</div>
  </StaggerItem>
</StaggerContainer>
```

## Hooks

### useAuth

Hook for authentication state and operations.

```tsx
import { useAuth } from '@/hooks/useAuth';

const MyComponent = () => {
  const { user, login, logout, isLoading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email, password });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {user ? (
        <div>Welcome, {user.username}!</div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
};
```

**Returns:**
- `user: User | null` - Current user object
- `login: (credentials: LoginCredentials) => Promise<void>` - Login function
- `logout: () => Promise<void>` - Logout function
- `register: (userData: RegisterData) => Promise<void>` - Register function
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state

### useWebRTC

Hook for WebRTC video calling functionality.

```tsx
import { useWebRTC } from '@/hooks/useWebRTC';

const VideoCall = ({ sessionId }) => {
  const {
    localStream,
    remoteStream,
    isConnected,
    isMuted,
    isVideoOff,
    startCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useWebRTC(sessionId);

  return (
    <div>
      <video ref={localVideoRef} autoPlay muted />
      <video ref={remoteVideoRef} autoPlay />

      <button onClick={toggleMute}>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <button onClick={toggleVideo}>
        {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
      </button>
      <button onClick={endCall}>End Call</button>
    </div>
  );
};
```

### useSocket

Hook for Socket.io real-time communication.

```tsx
import { useSocket } from '@/hooks/useSocket';

const RealTimeComponent = () => {
  const { socket, isConnected, emit, on, off } = useSocket();

  useEffect(() => {
    // Listen for events
    on('matching:found', handleMatchFound);
    on('queue:update', handleQueueUpdate);

    return () => {
      // Cleanup listeners
      off('matching:found', handleMatchFound);
      off('queue:update', handleQueueUpdate);
    };
  }, [on, off]);

  const joinQueue = () => {
    emit('matching:join-queue', {
      preferredSkills: ['javascript', 'react'],
      sessionType: 'learning'
    });
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <button onClick={joinQueue}>Join Queue</button>
    </div>
  );
};
```

### useErrorHandler

Hook for centralized error handling.

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

const MyComponent = () => {
  const { handleError, clearError, error } = useErrorHandler();

  const fetchData = async () => {
    try {
      const data = await api.getData();
      // Handle success
    } catch (err) {
      handleError(err, {
        context: 'fetchData',
        showToast: true,
        logError: true
      });
    }
  };

  return (
    <div>
      {error && (
        <div className="error-message">
          {error.message}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
      <button onClick={fetchData}>Fetch Data</button>
    </div>
  );
};
```

## Provider Components

### ThemeProvider

Provides theme context and dark/light mode functionality.

```tsx
import { ThemeProvider } from '@/components/ui';

// Wrap your app
<ThemeProvider defaultTheme="dark">
  <App />
</ThemeProvider>

// Use in components
import { useTheme } from '@/components/ui';

const MyComponent = () => {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
};
```

### ResponsiveProvider

Provides responsive breakpoint information.

```tsx
import { ResponsiveProvider, useResponsive } from '@/components/ui';

// Wrap your app
<ResponsiveProvider>
  <App />
</ResponsiveProvider>

// Use in components
const MyComponent = () => {
  const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();

  return (
    <div>
      {isMobile && <MobileLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  );
};
```

### AccessibilityProvider

Provides accessibility features and preferences.

```tsx
import { AccessibilityProvider, useAccessibility } from '@/components/ui';

// Wrap your app
<AccessibilityProvider>
  <App />
</AccessibilityProvider>

// Use in components
const MyComponent = () => {
  const {
    reducedMotion,
    highContrast,
    focusVisible,
    announceToScreenReader
  } = useAccessibility();

  const handleAction = () => {
    announceToScreenReader('Action completed successfully');
  };

  return (
    <motion.div
      animate={!reducedMotion ? { scale: 1.05 } : {}}
      className={highContrast ? 'high-contrast' : ''}
    >
      Content
    </motion.div>
  );
};
```

## Best Practices

### Component Structure

```tsx
// Good component structure
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassButton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
  className?: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onAction,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleAction = async () => {
    setIsLoading(true);
    try {
      await onAction?.();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-white mb-4">
        {title}
      </h2>

      {user && (
        <GlassButton
          onClick={handleAction}
          loading={isLoading}
          variant="primary"
        >
          Perform Action
        </GlassButton>
      )}
    </GlassCard>
  );
};
```

### Error Boundaries

Always wrap components that might fail with error boundaries:

```tsx
import { ErrorBoundary } from '@/components/ui';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Accessibility

Ensure components are accessible:

```tsx
// Good accessibility practices
<button
  aria-label="Close modal"
  onClick={onClose}
  className="focus:outline-none focus:ring-2 focus:ring-primary-500"
>
  <svg aria-hidden="true">...</svg>
</button>

<div role="dialog" aria-labelledby="modal-title">
  <h2 id="modal-title">Modal Title</h2>
</div>
```

### Performance

Use lazy loading and memoization for better performance:

```tsx
import { lazy, memo } from 'react';
import { LazyComponent } from '@/components/ui';

// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Memoize components that don't need frequent re-renders
const MemoizedComponent = memo(MyComponent);

// Use lazy loading wrapper
<LazyComponent>
  <HeavyComponent />
</LazyComponent>
```

### Animation Guidelines

Use consistent animation patterns:

```tsx
import { fadeInUp, staggerContainer } from '@/components/ui';

<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
>
  <motion.div variants={fadeInUp}>Item 1</motion.div>
  <motion.div variants={fadeInUp}>Item 2</motion.div>
</motion.div>
```

### Responsive Design

Design mobile-first and use responsive utilities:

```tsx
<div className="
  grid
  grid-cols-1
  md:grid-cols-2
  lg:grid-cols-3
  gap-4
  md:gap-6
">
  {items.map(item => (
    <GlassCard key={item.id} className="p-4 md:p-6">
      {item.content}
    </GlassCard>
  ))}
</div>
```

## Testing Components

### Unit Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const mockAction = jest.fn();
    render(<MyComponent title="Test" onAction={mockAction} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockAction).toHaveBeenCalled();
  });
});
```

### Integration Testing

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { MyComponent } from './MyComponent';

const renderWithProviders = (component) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('MyComponent Integration', () => {
  it('works with auth context', async () => {
    renderWithProviders(<MyComponent title="Test" />);

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });
});
```

## Contributing

When creating new components:

1. Follow the established patterns and naming conventions
2. Include comprehensive TypeScript types
3. Add proper accessibility attributes
4. Include error boundaries where appropriate
5. Write unit tests
6. Update this documentation
7. Add Storybook stories for visual testing

For more information, see the [Contributing Guide](./CONTRIBUTING.md).