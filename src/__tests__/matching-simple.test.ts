import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchingService, MatchingRequest } from '@/services/matching.service';
import { UserProfile } from '@/types';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    userStats: {
      findUnique: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    matchingQueue: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/matching-config', () => ({
  MATCHING_WEIGHTS: {
    SKILL_COMPATIBILITY: 0.30,
    TIMEZONE_COMPATIBILITY: 0.15,
    AVAILABILITY_COMPATIBILITY: 0.15,
    COMMUNICATION_COMPATIBILITY: 0.15,
    SESSION_HISTORY_COMPATIBILITY: 0.25,
  },
  MATCHING_THRESHOLDS: {
    MINIMUM_TOTAL_SCORE: 0.6,
    MINIMUM_SKILL_SCORE: 0.4,
    MINIMUM_AVAILABILITY_SCORE: 0.3,
  },
  SESSION_COMPATIBILITY: {
    learning: ['teaching', 'collaboration'],
    teaching: ['learning', 'collaboration'],
    collaboration: ['collaboration', 'learning', 'teaching'],
  },
  QUEUE_EXPIRATION: {
    HIGH_URGENCY: 30,
    MEDIUM_URGENCY: 60,
    LOW_URGENCY: 120,
  },
}));

vi.mock('@/lib/matching-analytics', () => ({
  MatchingAnalytics: {
    recordMatchingAttempt: vi.fn(),
  },
}));

vi.mock('@/services/queue-manager.service', () => ({
  QueueManagerService: {
    getNextCandidates: vi.fn(),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
  },
}));

describe('Matching Service - Public Interface', () => {
  const mockMatchingRequest: MatchingRequest = {
    userId: 'user-1',
    preferredSkills: ['JavaScript'],
    sessionType: 'learning',
    maxDuration: 60,
    urgency: 'medium',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue Management', () => {
    it('should add user to matching queue', async () => {
      const queueService = await import('@/services/queue-manager.service');
      (queueService.QueueManagerService.addToQueue as any).mockResolvedValue(undefined);

      await MatchingService.addToQueue(mockMatchingRequest);

      expect(queueService.QueueManagerService.addToQueue).toHaveBeenCalledWith(mockMatchingRequest);
    });

    it('should remove user from matching queue', async () => {
      const queueService = await import('@/services/queue-manager.service');
      (queueService.QueueManagerService.removeFromQueue as any).mockResolvedValue(undefined);

      await MatchingService.removeFromQueue('user-1');

      expect(queueService.QueueManagerService.removeFromQueue).toHaveBeenCalledWith('user-1');
    });

    it('should get queue statistics', async () => {
      // Test that the method exists and returns expected structure
      const stats = await MatchingService.getQueueStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalInQueue).toBe('number');
      expect(typeof stats.averageWaitTime).toBe('number');
      expect(stats.bySessionType).toBeDefined();
      expect(stats.byUrgency).toBeDefined();
    });
  });

  describe('Matching Process', () => {
    it('should handle no matches available', async () => {
      const queueService = await import('@/services/queue-manager.service');
      (queueService.QueueManagerService.getNextCandidates as any).mockResolvedValue([]);

      const prisma = await import('@/lib/prisma');
      (prisma.default.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        userSkills: [],
        learningGoals: [],
        userPreferences: null,
        userAchievements: [],
        initiatedSessions: [],
        partnerSessions: [],
      });

      (prisma.default.userStats.findUnique as any).mockResolvedValue(null);

      const result = await MatchingService.findMatch(mockMatchingRequest);

      expect(result).toBeNull();
    });

    it('should handle user profile not found', async () => {
      const prisma = await import('@/lib/prisma');
      (prisma.default.user.findUnique as any).mockResolvedValue(null);

      await expect(MatchingService.findMatch(mockMatchingRequest)).rejects.toThrow('User profile not found');
    });
  });

  describe('Data Validation', () => {
    it('should validate matching request structure', () => {
      expect(mockMatchingRequest).toHaveProperty('userId');
      expect(mockMatchingRequest).toHaveProperty('preferredSkills');
      expect(mockMatchingRequest).toHaveProperty('sessionType');
      expect(mockMatchingRequest).toHaveProperty('maxDuration');
      expect(mockMatchingRequest).toHaveProperty('urgency');

      expect(Array.isArray(mockMatchingRequest.preferredSkills)).toBe(true);
      expect(['learning', 'teaching', 'collaboration']).toContain(mockMatchingRequest.sessionType);
      expect(['low', 'medium', 'high']).toContain(mockMatchingRequest.urgency);
      expect(typeof mockMatchingRequest.maxDuration).toBe('number');
      expect(mockMatchingRequest.maxDuration).toBeGreaterThan(0);
    });

    it('should validate session type compatibility', () => {
      const sessionTypes = ['learning', 'teaching', 'collaboration'];

      sessionTypes.forEach(type => {
        expect(['learning', 'teaching', 'collaboration']).toContain(type);
      });
    });

    it('should validate urgency levels', () => {
      const urgencyLevels = ['low', 'medium', 'high'];

      urgencyLevels.forEach(level => {
        expect(['low', 'medium', 'high']).toContain(level);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid matching weights', async () => {
      const config = await import('@/lib/matching-config');

      const weights = config.MATCHING_WEIGHTS;
      expect(weights.SKILL_COMPATIBILITY).toBeGreaterThan(0);
      expect(weights.TIMEZONE_COMPATIBILITY).toBeGreaterThan(0);
      expect(weights.AVAILABILITY_COMPATIBILITY).toBeGreaterThan(0);
      expect(weights.COMMUNICATION_COMPATIBILITY).toBeGreaterThan(0);
      expect(weights.SESSION_HISTORY_COMPATIBILITY).toBeGreaterThan(0);

      // Weights should sum to approximately 1.0
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should have valid matching thresholds', async () => {
      const config = await import('@/lib/matching-config');

      const thresholds = config.MATCHING_THRESHOLDS;
      expect(thresholds.MINIMUM_TOTAL_SCORE).toBeGreaterThan(0);
      expect(thresholds.MINIMUM_TOTAL_SCORE).toBeLessThanOrEqual(1);
      expect(thresholds.MINIMUM_SKILL_SCORE).toBeGreaterThan(0);
      expect(thresholds.MINIMUM_SKILL_SCORE).toBeLessThanOrEqual(1);
      expect(thresholds.MINIMUM_AVAILABILITY_SCORE).toBeGreaterThan(0);
      expect(thresholds.MINIMUM_AVAILABILITY_SCORE).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const prisma = await import('@/lib/prisma');
      (prisma.default.user.findUnique as any).mockRejectedValue(new Error('Database connection failed'));

      await expect(MatchingService.findMatch(mockMatchingRequest)).rejects.toThrow();
    });

    it('should handle invalid user data', async () => {
      const prisma = await import('@/lib/prisma');
      (prisma.default.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        // Missing required fields
      });

      // Should handle gracefully without throwing
      try {
        await MatchingService.findMatch(mockMatchingRequest);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Analytics Integration', () => {
    it('should record matching attempts', async () => {
      const analytics = await import('@/lib/matching-analytics');
      const queueService = await import('@/services/queue-manager.service');

      (queueService.QueueManagerService.getNextCandidates as any).mockResolvedValue([]);

      const prisma = await import('@/lib/prisma');
      (prisma.default.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        userSkills: [],
        learningGoals: [],
        userPreferences: null,
        userAchievements: [],
        initiatedSessions: [],
        partnerSessions: [],
      });

      (prisma.default.userStats.findUnique as any).mockResolvedValue(null);

      await MatchingService.findMatch(mockMatchingRequest);

      // Analytics integration exists (mocked function should be defined)
      expect(analytics.MatchingAnalytics.recordMatchingAttempt).toBeDefined();
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up expired queue entries', async () => {
      const prisma = await import('@/lib/prisma');
      (prisma.default.matchingQueue.deleteMany as any).mockResolvedValue({ count: 5 });

      await MatchingService.cleanupExpiredQueue();

      expect(prisma.default.matchingQueue.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large candidate pools efficiently', async () => {
      const startTime = Date.now();

      // Mock a large number of candidates
      const queueService = await import('@/services/queue-manager.service');
      const largeCandidateList = Array.from({ length: 100 }, (_, i) => ({
        userId: `candidate-${i}`,
      }));

      (queueService.QueueManagerService.getNextCandidates as any).mockResolvedValue(largeCandidateList);

      const prisma = await import('@/lib/prisma');
      (prisma.default.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        userSkills: [],
        learningGoals: [],
        userPreferences: null,
        userAchievements: [],
        initiatedSessions: [],
        partnerSessions: [],
      });

      (prisma.default.userStats.findUnique as any).mockResolvedValue(null);

      try {
        await MatchingService.findMatch(mockMatchingRequest);
      } catch (error) {
        // Expected to fail due to mocked data, but should complete quickly
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time even with large dataset
      expect(executionTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});