import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Simple test components for testing infrastructure
const TestButton: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({
  onClick,
  children
}) => (
  <button onClick={onClick} data-testid="test-button">
    {children}
  </button>
);

const TestInput: React.FC<{
  placeholder?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}> = ({ placeholder, onChange, disabled }) => (
  <input
    placeholder={placeholder}
    onChange={(e) => onChange?.(e.target.value)}
    disabled={disabled}
    data-testid="test-input"
  />
);

const TestCard: React.FC<{
  className?: string;
  children: React.ReactNode
}> = ({ className, children }) => (
  <div className={className} data-testid="test-card">
    {children}
  </div>
);

describe('Component Testing Infrastructure', () => {
  describe('Basic Component Rendering', () => {
    it('should render a simple button component', () => {
      render(<TestButton>Click Me</TestButton>);

      expect(screen.getByTestId('test-button')).toBeInTheDocument();
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should render a simple input component', () => {
      render(<TestInput placeholder="Enter text" />);

      expect(screen.getByTestId('test-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render a simple card component', () => {
      render(
        <TestCard className="test-class">
          <h2>Card Title</h2>
          <p>Card content</p>
        </TestCard>
      );

      expect(screen.getByTestId('test-card')).toBeInTheDocument();
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
      expect(screen.getByTestId('test-card')).toHaveClass('test-class');
    });
  });

  describe('User Interactions', () => {
    it('should handle button clicks', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<TestButton onClick={handleClick}>Click Me</TestButton>);

      await user.click(screen.getByTestId('test-button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle input changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<TestInput placeholder="Enter text" onChange={handleChange} />);

      const input = screen.getByTestId('test-input');
      await user.type(input, 'test input');

      expect(handleChange).toHaveBeenCalledTimes(10); // Once per character
      expect(handleChange).toHaveBeenLastCalledWith('test input');
    });

    it('should handle disabled states', () => {
      render(<TestInput placeholder="Disabled input" disabled />);

      const input = screen.getByTestId('test-input');
      expect(input).toBeDisabled();
    });
  });

  describe('Accessibility Testing', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<TestButton onClick={handleClick}>Click Me</TestButton>);

      const button = screen.getByTestId('test-button');
      button.focus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should support tab navigation', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <TestInput placeholder="First input" />
          <TestInput placeholder="Second input" />
        </div>
      );

      const firstInput = screen.getByPlaceholderText('First input');
      const secondInput = screen.getByPlaceholderText('Second input');

      await user.tab();
      expect(firstInput).toHaveFocus();

      await user.tab();
      expect(secondInput).toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <TestButton onClick={vi.fn()}>
          <span aria-label="Close dialog">×</span>
        </TestButton>
      );

      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });
  });

  describe('Component State Management', () => {
    const StatefulComponent: React.FC = () => {
      const [count, setCount] = React.useState(0);

      return (
        <div>
          <span data-testid="count">{count}</span>
          <TestButton onClick={() => setCount(count + 1)}>
            Increment
          </TestButton>
        </div>
      );
    };

    it('should handle component state changes', async () => {
      const user = userEvent.setup();

      render(<StatefulComponent />);

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      await user.click(screen.getByText('Increment'));
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      await user.click(screen.getByText('Increment'));
      expect(screen.getByTestId('count')).toHaveTextContent('2');
    });
  });

  describe('Error Handling', () => {
    const ErrorComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const [hasError, setHasError] = React.useState(false);

      React.useEffect(() => {
        const handleError = () => setHasError(true);
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
      }, []);

      if (hasError) {
        return <div data-testid="error-boundary">Something went wrong</div>;
      }

      return <>{children}</>;
    };

    it('should handle component errors gracefully', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      expect(() => {
        render(<ErrorComponent shouldThrow={true} />);
      }).toThrow('Test error');

      consoleSpy.mockRestore();
    });

    it('should render without errors when no error occurs', () => {
      render(<ErrorComponent shouldThrow={false} />);

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should render components efficiently', () => {
      const startTime = performance.now();

      // Render multiple components
      render(
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <TestCard key={i} className={`card-${i}`}>
              <TestButton onClick={vi.fn()}>Button {i}</TestButton>
              <TestInput placeholder={`Input ${i}`} />
            </TestCard>
          ))}
        </div>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000); // 1 second max

      // Verify all components are rendered
      expect(screen.getAllByTestId('test-card')).toHaveLength(100);
      expect(screen.getAllByTestId('test-button')).toHaveLength(100);
      expect(screen.getAllByTestId('test-input')).toHaveLength(100);
    });
  });

  describe('Testing Library Integration', () => {
    it('should work with testing library queries', () => {
      render(
        <div>
          <TestButton onClick={vi.fn()}>Submit</TestButton>
          <TestInput placeholder="Username" />
          <TestCard className="form-card">
            <h1>Login Form</h1>
          </TestCard>
        </div>
      );

      // Test different query methods
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Login Form' })).toBeInTheDocument();
      expect(screen.getByText('Login Form')).toBeInTheDocument();
    });

    it('should support async operations', async () => {
      const AsyncComponent: React.FC = () => {
        const [loading, setLoading] = React.useState(true);
        const [data, setData] = React.useState<string | null>(null);

        React.useEffect(() => {
          setTimeout(() => {
            setData('Loaded data');
            setLoading(false);
          }, 100);
        }, []);

        if (loading) {
          return <div data-testid="loading">Loading...</div>;
        }

        return <div data-testid="data">{data}</div>;
      };

      render(<AsyncComponent />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for async operation to complete
      await screen.findByTestId('data');
      expect(screen.getByTestId('data')).toHaveTextContent('Loaded data');
    });
  });

  describe('Mock Integration', () => {
    it('should work with mocked functions', () => {
      const mockFn = vi.fn();
      mockFn.mockReturnValue('mocked value');

      expect(mockFn()).toBe('mocked value');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should work with mocked modules', () => {
      // Test that vi.fn() works correctly
      const mockCallback = vi.fn();

      render(<TestButton onClick={mockCallback}>Test</TestButton>);

      expect(mockCallback).not.toHaveBeenCalled();

      screen.getByTestId('test-button').click();

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });
});