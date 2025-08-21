import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { setupGlobalMocks } from './test-helpers';

// Setup all global mocks
setupGlobalMocks();

// Mock window.visualViewport
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  value: {
    width: 1024,
    height: 768,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn().mockImplementation(id => clearTimeout(id));

// Mock navigator properties
Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  value: 0,
});

Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  value: 4,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};