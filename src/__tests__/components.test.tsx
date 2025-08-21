import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock authentication hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      isVerified: true,
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
}));

// Mock WebRTC hook
vi.mock('@/hooks/useWebRTC', () => ({
  useWebRTC: () => ({
    localStream: null,
    remoteStream: null,
    isConnected: false,
    isConnecting: false,
    connectionQuality: 'good',
    startCall: vi.fn(),
    endCall: vi.fn(),
    toggleMute: vi.fn(),
    toggleVideo: vi.fn(),
    isMuted: false,
    isVideoEnabled: true,
  }),
}));

// Mock Socket.io hook
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    socket: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
    isConnected: true,
  }),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Component Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Authentication Components', () => {
    describe('LoginForm', () => {
      it('should render login form correctly', async () => {
        const { LoginForm } = await import('@/components/auth/LoginForm');

        render(
          <TestWrapper>
            <LoginForm />
          </TestWrapper>
        );

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      });

      it('should handle form submission', async () => {
        const mockLogin = vi.fn();
        vi.mocked(await import('@/hooks/useAuth')).useAuth.mockReturnValue({
          user: null,
          isAuthenticated: false,
          login: mockLogin,
          logout: vi.fn(),
          register: vi.fn(),
        });

        const { LoginForm } = await import('@/components/auth/LoginForm');

        render(
          <TestWrapper>
            <LoginForm />
          </TestWrapper>
        );

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockLogin).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
          });
        });
      });

      it('should display validation errors', async () => {
        const { LoginForm } = await import('@/components/auth/LoginForm');

        render(
          <TestWrapper>
            <LoginForm />
          </TestWrapper>
        );

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/email is required/i)).toBeInTheDocument();
          expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
      });

      it('should show loading state during submission', async () => {
        const mockLogin = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
        vi.mocked(await import('@/hooks/useAuth')).useAuth.mockReturnValue({
          user: null,
          isAuthenticated: false,
          login: mockLogin,
          logout: vi.fn(),
          register: vi.fn(),
        });

        const { LoginForm } = await import('@/components/auth/LoginForm');

        render(
          <TestWrapper>
            <LoginForm />
          </TestWrapper>
        );

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });

    describe('RegisterForm', () => {
      it('should render registration form correctly', async () => {
        const { RegisterForm } = await import('@/components/auth/RegisterForm');

        render(
          <TestWrapper>
            <RegisterForm />
          </TestWrapper>
        );

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      });

      it('should validate password strength', async () => {
        const { RegisterForm } = await import('@/components/auth/RegisterForm');

        render(
          <TestWrapper>
            <RegisterForm />
          </TestWrapper>
        );

        const passwordInput = screen.getByLabelText(/password/i);
        await user.type(passwordInput, 'weak');

        await waitFor(() => {
          expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
        });
      });

      it('should handle successful registration', async () => {
        const mockRegister = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(await import('@/hooks/useAuth')).useAuth.mockReturnValue({
          user: null,
          isAuthenticated: false,
          login: vi.fn(),
          logout: vi.fn(),
          register: mockRegister,
        });

        const { RegisterForm } = await import('@/components/auth/RegisterForm');

        render(
          <TestWrapper>
            <RegisterForm />
          </TestWrapper>
        );

        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/username/i), 'testuser');
        await user.type(screen.getByLabelText(/password/i), 'StrongPass123!');
        await user.selectOptions(screen.getByLabelText(/timezone/i), 'America/New_York');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
          expect(mockRegister).toHaveBeenCalledWith({
            email: 'test@example.com',
            username: 'testuser',
            password: 'StrongPass123!',
            timezone: 'America/New_York',
          });
        });
      });
    });
  });

  describe('UI Components', () => {
    describe('GlassButton', () => {
      it('should render with correct variant classes', async () => {
        const { GlassButton } = await import('@/components/ui/GlassButton');

        const { rerender } = render(
          <GlassButton variant="primary">Primary Button</GlassButton>
        );

        expect(screen.getByRole('button')).toHaveClass('glass-primary');

        rerender(<GlassButton variant="secondary">Secondary Button</GlassButton>);
        expect(screen.getByRole('button')).toHaveClass('glass-secondary');

        rerender(<GlassButton variant="accent">Accent Button</GlassButton>);
        expect(screen.getByRole('button')).toHaveClass('glass-accent');
      });

      it('should handle click events', async () => {
        const handleClick = vi.fn();
        const { GlassButton } = await import('@/components/ui/GlassButton');

        render(<GlassButton onClick={handleClick}>Click Me</GlassButton>);

        await user.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('should show loading state', async () => {
        const { GlassButton } = await import('@/components/ui/GlassButton');

        render(<GlassButton loading>Loading Button</GlassButton>);

        expect(screen.getByRole('button')).toBeDisabled();
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      it('should be disabled when disabled prop is true', async () => {
        const handleClick = vi.fn();
        const { GlassButton } = await import('@/components/ui/GlassButton');

        render(
          <GlassButton disabled onClick={handleClick}>
            Disabled Button
          </GlassButton>
        );

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();

        await user.click(button);
        expect(handleClick).not.toHaveBeenCalled();
      });
    });

    describe('GlassCard', () => {
      it('should render children correctly', async () => {
        const { GlassCard } = await import('@/components/ui/GlassCard');

        render(
          <GlassCard>
            <h2>Card Title</h2>
            <p>Card content</p>
          </GlassCard>
        );

        expect(screen.getByText('Card Title')).toBeInTheDocument();
        expect(screen.getByText('Card content')).toBeInTheDocument();
      });

      it('should apply custom className', async () => {
        const { GlassCard } = await import('@/components/ui/GlassCard');

        render(
          <GlassCard className="custom-class">
            Content
          </GlassCard>
        );

        expect(screen.getByText('Content').parentElement).toHaveClass('custom-class');
      });
    });

    describe('GlassInput', () => {
      it('should handle input changes', async () => {
        const handleChange = vi.fn();
        const { GlassInput } = await import('@/components/ui/GlassInput');

        render(
          <GlassInput
            placeholder="Enter text"
            onChange={handleChange}
          />
        );

        const input = screen.getByPlaceholderText('Enter text');
        await user.type(input, 'test input');

        expect(handleChange).toHaveBeenCalledTimes(10); // Once per character
        expect(handleChange).toHaveBeenLastCalledWith('test input');
      });

      it('should display error messages', async () => {
        const { GlassInput } = await import('@/components/ui/GlassInput');

        render(
          <GlassInput
            error="This field is required"
            placeholder="Enter text"
          />
        );

        expect(screen.getByText('This field is required')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter text')).toHaveClass('error');
      });

      it('should be disabled when disabled prop is true', async () => {
        const { GlassInput } = await import('@/components/ui/GlassInput');

        render(
          <GlassInput
            disabled
            placeholder="Disabled input"
          />
        );

        const input = screen.getByPlaceholderText('Disabled input');
        expect(input).toBeDisabled();
      });
    });
  });

  describe('Feature Components', () => {
    describe('VideoCallComponent', () => {
      it('should render video call interface', async () => {
        const { VideoCallComponent } = await import('@/components/features/VideoCallComponent');

        render(
          <TestWrapper>
            <VideoCallComponent sessionId="session-123" />
          </TestWrapper>
        );

        expect(screen.getByText(/video call/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /end call/i })).toBeInTheDocument();
      });

      it('should handle mute toggle', async () => {
        const mockToggleMute = vi.fn();
        vi.mocked(await import('@/hooks/useWebRTC')).useWebRTC.mockReturnValue({
          localStream: null,
          remoteStream: null,
          isConnected: true,
          isConnecting: false,
          connectionQuality: 'good',
          startCall: vi.fn(),
          endCall: vi.fn(),
          toggleMute: mockToggleMute,
          toggleVideo: vi.fn(),
          isMuted: false,
          isVideoEnabled: true,
        });

        const { VideoCallComponent } = await import('@/components/features/VideoCallComponent');

        render(
          <TestWrapper>
            <VideoCallComponent sessionId="session-123" />
          </TestWrapper>
        );

        await user.click(screen.getByRole('button', { name: /mute/i }));
        expect(mockToggleMute).toHaveBeenCalledTimes(1);
      });

      it('should show connection status', async () => {
        vi.mocked(await import('@/hooks/useWebRTC')).useWebRTC.mockReturnValue({
          localStream: null,
          remoteStream: null,
          isConnected: false,
          isConnecting: true,
          connectionQuality: 'poor',
          startCall: vi.fn(),
          endCall: vi.fn(),
          toggleMute: vi.fn(),
          toggleVideo: vi.fn(),
          isMuted: false,
          isVideoEnabled: true,
        });

        const { VideoCallComponent } = await import('@/components/features/VideoCallComponent');

        render(
          <TestWrapper>
            <VideoCallComponent sessionId="session-123" />
          </TestWrapper>
        );

        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });
    });

    describe('DashboardOverview', () => {
      it('should render dashboard metrics', async () => {
        // Mock API response
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              onlineUsers: 150,
              activeMatches: 25,
              totalSessions: 1250,
              averageRating: 4.6,
            },
          }),
        });

        const { DashboardOverview } = await import('@/components/features/DashboardOverview');

        render(
          <TestWrapper>
            <DashboardOverview />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('150')).toBeInTheDocument(); // Online users
          expect(screen.getByText('25')).toBeInTheDocument(); // Active matches
          expect(screen.getByText('1,250')).toBeInTheDocument(); // Total sessions
          expect(screen.getByText('4.6')).toBeInTheDocument(); // Average rating
        });
      });

      it('should handle loading state', async () => {
        // Mock slow API response
        global.fetch = vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 1000))
        );

        const { DashboardOverview } = await import('@/components/features/DashboardOverview');

        render(
          <TestWrapper>
            <DashboardOverview />
          </TestWrapper>
        );

        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      it('should handle error state', async () => {
        // Mock API error
        global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

        const { DashboardOverview } = await import('@/components/features/DashboardOverview');

        render(
          <TestWrapper>
            <DashboardOverview />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(/error loading dashboard data/i)).toBeInTheDocument();
        });
      });
    });

    describe('AchievementNotification', () => {
      it('should render achievement notification', async () => {
        const mockAchievement = {
          id: 'achievement-1',
          name: 'First Session',
          description: 'Complete your first learning session',
          iconUrl: '/icons/first-session.png',
          category: 'milestone',
          points: 10,
          rarity: 'common' as const,
        };

        const { AchievementNotification } = await import('@/components/features/AchievementNotification');

        render(
          <AchievementNotification
            achievement={mockAchievement}
            isVisible={true}
            onClose={vi.fn()}
          />
        );

        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
        expect(screen.getByText('First Session')).toBeInTheDocument();
        expect(screen.getByText('Complete your first learning session')).toBeInTheDocument();
        expect(screen.getByText('10 points')).toBeInTheDocument();
      });

      it('should handle close action', async () => {
        const mockOnClose = vi.fn();
        const mockAchievement = {
          id: 'achievement-1',
          name: 'First Session',
          description: 'Complete your first learning session',
          iconUrl: '/icons/first-session.png',
          category: 'milestone',
          points: 10,
          rarity: 'common' as const,
        };

        const { AchievementNotification } = await import('@/components/features/AchievementNotification');

        render(
          <AchievementNotification
            achievement={mockAchievement}
            isVisible={true}
            onClose={mockOnClose}
          />
        );

        await user.click(screen.getByRole('button', { name: /close/i }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });

      it('should not render when not visible', async () => {
        const mockAchievement = {
          id: 'achievement-1',
          name: 'First Session',
          description: 'Complete your first learning session',
          iconUrl: '/icons/first-session.png',
          category: 'milestone',
          points: 10,
          rarity: 'common' as const,
        };

        const { AchievementNotification } = await import('@/components/features/AchievementNotification');

        render(
          <AchievementNotification
            achievement={mockAchievement}
            isVisible={false}
            onClose={vi.fn()}
          />
        );

        expect(screen.queryByText('Achievement Unlocked!')).not.toBeInTheDocument();
      });
    });
  });

  describe('Profile Components', () => {
    describe('SkillsManager', () => {
      it('should render user skills', async () => {
        const mockSkills = [
          {
            id: 'skill-1',
            skillId: 'js-skill',
            skill: {
              id: 'js-skill',
              name: 'JavaScript',
              category: 'Programming',
              description: 'JavaScript programming language',
              createdAt: new Date(),
            },
            proficiencyLevel: 3 as const,
            verified: false,
            endorsements: 2,
            createdAt: new Date(),
          },
        ];

        const { SkillsManager } = await import('@/components/profile/SkillsManager');

        render(
          <TestWrapper>
            <SkillsManager skills={mockSkills} onSkillUpdate={vi.fn()} />
          </TestWrapper>
        );

        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('Programming')).toBeInTheDocument();
        expect(screen.getByText('Level 3')).toBeInTheDocument();
        expect(screen.getByText('2 endorsements')).toBeInTheDocument();
      });

      it('should handle skill level updates', async () => {
        const mockOnSkillUpdate = vi.fn();
        const mockSkills = [
          {
            id: 'skill-1',
            skillId: 'js-skill',
            skill: {
              id: 'js-skill',
              name: 'JavaScript',
              category: 'Programming',
              description: 'JavaScript programming language',
              createdAt: new Date(),
            },
            proficiencyLevel: 3 as const,
            verified: false,
            endorsements: 2,
            createdAt: new Date(),
          },
        ];

        const { SkillsManager } = await import('@/components/profile/SkillsManager');

        render(
          <TestWrapper>
            <SkillsManager skills={mockSkills} onSkillUpdate={mockOnSkillUpdate} />
          </TestWrapper>
        );

        // Click edit button
        await user.click(screen.getByRole('button', { name: /edit/i }));

        // Change skill level
        const levelSelect = screen.getByDisplayValue('3');
        await user.selectOptions(levelSelect, '4');

        // Save changes
        await user.click(screen.getByRole('button', { name: /save/i }));

        expect(mockOnSkillUpdate).toHaveBeenCalledWith('skill-1', { proficiencyLevel: 4 });
      });
    });

    describe('LearningGoalsManager', () => {
      it('should render learning goals', async () => {
        const mockGoals = [
          {
            id: 'goal-1',
            title: 'Learn React Hooks',
            description: 'Master useState and useEffect',
            targetDate: new Date('2024-12-31'),
            priority: 'high' as const,
            status: 'active' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const { LearningGoalsManager } = await import('@/components/profile/LearningGoalsManager');

        render(
          <TestWrapper>
            <LearningGoalsManager goals={mockGoals} onGoalUpdate={vi.fn()} />
          </TestWrapper>
        );

        expect(screen.getByText('Learn React Hooks')).toBeInTheDocument();
        expect(screen.getByText('Master useState and useEffect')).toBeInTheDocument();
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      it('should handle goal creation', async () => {
        const mockOnGoalUpdate = vi.fn();

        const { LearningGoalsManager } = await import('@/components/profile/LearningGoalsManager');

        render(
          <TestWrapper>
            <LearningGoalsManager goals={[]} onGoalUpdate={mockOnGoalUpdate} />
          </TestWrapper>
        );

        // Click add goal button
        await user.click(screen.getByRole('button', { name: /add goal/i }));

        // Fill in goal form
        await user.type(screen.getByLabelText(/title/i), 'New Learning Goal');
        await user.type(screen.getByLabelText(/description/i), 'Goal description');
        await user.selectOptions(screen.getByLabelText(/priority/i), 'medium');

        // Submit form
        await user.click(screen.getByRole('button', { name: /create goal/i }));

        expect(mockOnGoalUpdate).toHaveBeenCalledWith({
          title: 'New Learning Goal',
          description: 'Goal description',
          priority: 'medium',
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const { GlassButton } = await import('@/components/ui/GlassButton');

      render(
        <GlassButton aria-label="Close dialog">
          ×
        </GlassButton>
      );

      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const handleClick = vi.fn();
      const { GlassButton } = await import('@/components/ui/GlassButton');

      render(<GlassButton onClick={handleClick}>Click Me</GlassButton>);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper focus management', async () => {
      const { GlassInput } = await import('@/components/ui/GlassInput');

      render(
        <div>
          <GlassInput placeholder="First input" />
          <GlassInput placeholder="Second input" />
        </div>
      );

      const firstInput = screen.getByPlaceholderText('First input');
      const secondInput = screen.getByPlaceholderText('Second input');

      await user.tab();
      expect(firstInput).toHaveFocus();

      await user.tab();
      expect(secondInput).toHaveFocus();
    });
  });

  describe('Error Boundaries', () => {
    it('should catch and display component errors', async () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const { ErrorBoundary } = await import('@/components/ui/ErrorBoundary');

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});