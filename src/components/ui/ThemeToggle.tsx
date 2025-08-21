'use client';

import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { GlassButton } from './GlassButton';
import { cn } from '@/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'switch' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
}

const ThemeToggle = ({
  className,
  variant = 'button',
  size = 'md'
}: ThemeToggleProps) => {
  const { theme, setTheme, actualTheme } = useTheme();

  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <span className="text-white/70 text-sm">Light</span>
        <button
          onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            actualTheme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'
          )}
        >
          <motion.span
            layout
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              actualTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        <span className="text-white/70 text-sm">Dark</span>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={cn('relative', className)}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="light" className="bg-gray-800 text-white">Light</option>
          <option value="dark" className="bg-gray-800 text-white">Dark</option>
          <option value="system" className="bg-gray-800 text-white">System</option>
        </select>
      </div>
    );
  }

  // Default button variant
  const cycleTheme = () => {
    const themes: Array<typeof theme> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getIcon = () => {
    if (theme === 'system') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }

    if (actualTheme === 'dark') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  };

  const getLabel = () => {
    if (theme === 'system') return 'System';
    return actualTheme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <GlassButton
      variant="ghost"
      size={size}
      onClick={cycleTheme}
      className={cn('flex items-center space-x-2', className)}
      title={`Current theme: ${getLabel()}. Click to cycle themes.`}
    >
      <motion.div
        key={theme + actualTheme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {getIcon()}
      </motion.div>
      <span className="hidden sm:inline">{getLabel()}</span>
    </GlassButton>
  );
};

export { ThemeToggle };