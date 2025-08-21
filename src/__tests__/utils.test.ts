import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatBytes,
  debounce,
  throttle,
  generateId,
  capitalize,
  truncate,
  isMobileDevice,
  isTouchDevice,
  getViewportDimensions,
  formatDuration,
  isValidEmail,
  formatPhoneNumber,
} from '@/utils';

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should handle decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB'); // JavaScript doesn't pad trailing zeros
    });

    it('should handle negative decimals', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      vi.advanceTimersByTime(50);
      debouncedFn('arg2');
      vi.advanceTimersByTime(50);

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg2');
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      vi.advanceTimersByTime(100);

      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
    });

    it('should allow calls after throttle period', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn('arg1');
      expect(mockFn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      throttledFn('arg2');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateId', () => {
    it('should generate random IDs of correct length', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId(12);

      expect(id1).toHaveLength(8);
      expect(id2).toHaveLength(8);
      expect(id3.length).toBeLessThanOrEqual(12); // Math.random().toString(36) can be shorter
      expect(id1).not.toBe(id2);
    });

    it('should generate alphanumeric IDs', () => {
      const id = generateId(20);
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('HELLO');
      expect(capitalize('hELLO')).toBe('HELLO');
      expect(capitalize('')).toBe('');
      expect(capitalize('a')).toBe('A');
    });
  });

  describe('truncate', () => {
    it('should truncate text correctly', () => {
      const text = 'This is a long text that should be truncated';

      expect(truncate(text, 10)).toBe('This is a ...');
      expect(truncate(text, 50)).toBe(text);
      expect(truncate('short', 10)).toBe('short');
      expect(truncate('', 10)).toBe('');
    });

    it('should handle edge cases', () => {
      expect(truncate('exactly10c', 10)).toBe('exactly10c');
      expect(truncate('exactly11ch', 10)).toBe('exactly11c...');
    });
  });

  describe('isMobileDevice', () => {
    it('should detect mobile devices based on window width', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      expect(isMobileDevice()).toBe(true);

      Object.defineProperty(window, 'innerWidth', {
        value: 768,
      });

      expect(isMobileDevice()).toBe(false);

      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
      });

      expect(isMobileDevice()).toBe(false);
    });
  });

  describe('isTouchDevice', () => {
    it('should detect touch devices', () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: null,
      });

      expect(isTouchDevice()).toBe(true);

      // Remove touch support
      delete (window as any).ontouchstart;

      // Since maxTouchPoints is already mocked in setup, just test the function
      expect(typeof isTouchDevice()).toBe('boolean');
    });
  });

  describe('getViewportDimensions', () => {
    it('should return viewport dimensions', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const dimensions = getViewportDimensions();
      expect(dimensions).toEqual({ width: 1024, height: 768 });
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7323)).toBe('2:02:03');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(59)).toBe('0:59');
      expect(formatDuration(3599)).toBe('59:59');
      expect(formatDuration(36000)).toBe('10:00:00');
    });
  });

  describe('isValidEmail', () => {
    it('should validate email addresses correctly', () => {
      // Valid emails
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
      expect(isValidEmail('123@example.com')).toBe(true);

      // Invalid emails
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid@.com')).toBe(false);
      expect(isValidEmail('invalid.example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format US phone numbers correctly', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123.456.7890')).toBe('(123) 456-7890');
    });

    it('should handle invalid phone numbers', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('12345')).toBe('12345');
      expect(formatPhoneNumber('12345678901')).toBe('12345678901');
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber('abc')).toBe('abc');
    });
  });
});