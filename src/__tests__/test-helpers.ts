import { vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Test utilities and helpers

/**
 * Create a test query client with disabled retries and caching
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/**
 * Mock user data for testing
 */
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  username: 'testuser',
  isVerified: true,
  timezone: 'UTC',
  avatarUrl: null,
};

/**
 * Mock user profile with complete data
 */
export const mockUserProfile = {
  ...mockUser,
  isActive: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-12-01'),
  lastActive: new Date('2023-12-01'),
  skills: [
    {
      id: 'skill-1',
      skillId: 'js-skill',
      skill: {
        id: 'js-skill',
        name: 'JavaScript',
        category: 'Programming',
        description: 'JavaScript programming language',
        createdAt: new Date('2023-01-01'),
      },
      proficiencyLevel: 3 as const,
      verified: false,
      endorsements: 2,
      createdAt: new Date('2023-01-01'),
    },
  ],
  learningGoals: [
    {
      id: 'goal-1',
      title: 'Learn React Hooks',
      description: 'Master useState and useEffect',
      targetDate: new Date('2024-12-31'),
      priority: 'high' as const,
      status: 'active' as const,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
  ],
  preferences: {
    id: 'pref-1',
    preferredSessionTypes: ['learning'] as const,
    maxSessionDuration: 60,
    communicationStyle: 'casual' as const,
    availabilitySchedule: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
      saturday: [],
      sunday: [],
    },
    languagePreferences: ['en'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  stats: {
    id: 'stats-1',
    totalSessions: 5,
    totalMinutesLearned: 300,
    averageRating: 4.2,
    skillsLearned: 2,
    skillsTaught: 1,
    achievementPoints: 100,
    currentStreak: 3,
    longestStreak: 5,
    lastSessionDate: new Date('2023-11-30'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-12-01'),
  },
  achievements: [],
};

/**
 * Mock session data
 */
export const mockSession = {
  id: 'session-123',
  initiatorId: 'user-123',
  partnerId: 'partner-456',
  sessionType: 'learning' as const,
  startTime: new Date('2023-12-01T10:00:00Z'),
  endTime: new Date('2023-12-01T11:00:00Z'),
  durationMinutes: 60,
  topics: ['JavaScript', 'React'],
  status: 'completed' as const,
  ratingInitiator: 5,
  ratingPartner: 4,
  feedbackInitiator: 'Great session!',
  feedbackPartner: 'Very helpful',
};

/**
 * Mock achievement data
 */
export const mockAchievement = {
  id: 'achievement-1',
  name: 'First Session',
  description: 'Complete your first learning session',
  iconUrl: '/icons/first-session.png',
  category: 'milestone',
  points: 10,
  rarity: 'common' as const,
  criteria: { sessionsCompleted: 1 },
  createdAt: new Date('2023-01-01'),
};

/**
 * Mock WebRTC peer connection
 */
export const createMockPeerConnection = () => ({
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  connectionState: 'connected',
  iceConnectionState: 'connected',
  localDescription: null,
  remoteDescription: null,
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  getTransceivers: vi.fn().mockReturnValue([]),
});

/**
 * Mock media stream
 */
export const createMockMediaStream = () => ({
  id: 'mock-stream-id',
  active: true,
  getTracks: vi.fn().mockReturnValue([
    { kind: 'video', enabled: true, stop: vi.fn() },
    { kind: 'audio', enabled: true, stop: vi.fn() },
  ]),
  getVideoTracks: vi.fn().mockReturnValue([
    { kind: 'video', enabled: true, stop: vi.fn() },
  ]),
  getAudioTracks: vi.fn().mockReturnValue([
    { kind: 'audio', enabled: true, stop: vi.fn() },
  ]),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  clone: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

/**
 * Mock Socket.io client
 */
export const createMockSocket = () => ({
  id: 'mock-socket-id',
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

/**
 * Mock fetch responses
 */
export const mockFetchResponse = (data: any, ok = true, status = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'basic' as ResponseType,
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
  } as Response);
};

/**
 * Mock successful API response
 */
export const mockSuccessResponse = (data: any) =>
  mockFetchResponse({ success: true, data });

/**
 * Mock error API response
 */
export const mockErrorResponse = (error: string, status = 400) =>
  mockFetchResponse({ success: false, error }, false, status);

/**
 * Mock validation error response
 */
export const mockValidationErrorResponse = (errors: Record<string, string>) =>
  mockFetchResponse({
    success: false,
    error: 'Validation failed',
    details: errors,
  }, false, 400);

/**
 * Setup global mocks for testing environment
 */
export const setupGlobalMocks = () => {
  // Mock window.matchMedia
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

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));

  // Mock WebRTC APIs
  global.RTCPeerConnection = vi.fn().mockImplementation(() => createMockPeerConnection());

  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(createMockMediaStream()),
    getDisplayMedia: vi.fn().mockResolvedValue(createMockMediaStream()),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  } as any;

  // Mock performance API
  Object.defineProperty(window, 'performance', {
    writable: true,
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
    },
  });

  // Mock localStorage and sessionStorage
  const createStorageMock = () => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  });

  Object.defineProperty(window, 'localStorage', {
    value: createStorageMock(),
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: createStorageMock(),
  });

  // Mock crypto API
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'mock-uuid-123'),
      getRandomValues: vi.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }),
    },
  });
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = (ms = 0) =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a mock timer for testing time-dependent code
 */
export const createMockTimer = () => {
  const callbacks: Array<() => void> = [];
  let time = 0;

  return {
    setTimeout: vi.fn((callback: () => void, delay: number) => {
      const id = callbacks.length;
      callbacks[id] = callback;
      return id;
    }),
    clearTimeout: vi.fn((id: number) => {
      delete callbacks[id];
    }),
    advanceTime: (ms: number) => {
      time += ms;
      callbacks.forEach(callback => callback && callback());
    },
    getTime: () => time,
  };
};

/**
 * Mock Next.js router
 */
export const createMockRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  pathname: '/dashboard',
  query: {},
  asPath: '/dashboard',
  route: '/dashboard',
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
});

/**
 * Test data generators
 */
export const generateMockUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    email: `user${i}@example.com`,
    username: `user${i}`,
    isVerified: i % 2 === 0,
    timezone: 'UTC',
    avatarUrl: i % 3 === 0 ? `https://example.com/avatar${i}.jpg` : null,
  }));
};

export const generateMockSessions = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `session-${i}`,
    initiatorId: `user-${i}`,
    partnerId: `partner-${i}`,
    sessionType: ['learning', 'teaching', 'collaboration'][i % 3] as const,
    startTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    durationMinutes: 60,
    topics: [`Topic ${i}`, `Skill ${i % 5}`],
    status: 'completed' as const,
    ratingInitiator: 3 + (i % 3),
    ratingPartner: 3 + ((i + 1) % 3),
  }));
};

export const generateMockSkills = (count: number) => {
  const categories = ['Programming', 'Framework', 'Database', 'DevOps', 'Design'];
  const skillNames = ['JavaScript', 'React', 'Node.js', 'Python', 'TypeScript', 'Vue.js', 'Angular', 'MongoDB', 'PostgreSQL', 'Docker'];

  return Array.from({ length: count }, (_, i) => ({
    id: `skill-${i}`,
    name: skillNames[i % skillNames.length],
    category: categories[i % categories.length],
    description: `${skillNames[i % skillNames.length]} skill description`,
    createdAt: new Date('2023-01-01'),
  }));
};

/**
 * Assertion helpers
 */
export const expectToBeValidUUID = (value: string) => {
  expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
};

export const expectToBeValidEmail = (value: string) => {
  expect(value).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

export const expectToBeValidDate = (value: any) => {
  expect(value).toBeInstanceOf(Date);
  expect(value.getTime()).not.toBeNaN();
};

export const expectToBeWithinRange = (value: number, min: number, max: number) => {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

/**
 * Custom render function with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return children as React.ReactElement;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Test cleanup utilities
 */
export const cleanupMocks = () => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.restoreAllMocks();
};

/**
 * Performance testing helpers
 */
export const measurePerformance = async (fn: () => Promise<any> | any) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    duration: end - start,
  };
};

export const expectPerformance = async (fn: () => Promise<any> | any, maxDuration: number) => {
  const { duration } = await measurePerformance(fn);
  expect(duration).toBeLessThan(maxDuration);
};

// Export all helpers
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';