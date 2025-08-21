import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});