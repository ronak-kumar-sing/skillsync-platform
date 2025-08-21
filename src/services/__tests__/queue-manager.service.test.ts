import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { QueueManagerService } from '../queue-manager.service';
import { QueueCleanupService } from '../queue-cleanup.service';
import redis from '@/lib/redis';

// Mock Redis
vi.mock('@/lib/redis', () => ({
  default: {
    pipeline: vi.fn(() => ({
      zadd: vi.fn(),
      lpush: vi.fn(),
      setex: vi.fn(),
      sadd: vi.fn(),
      expire: vi.fn(),
      zrem: vi.fn(),
      lrem: vi.fn(),
      del: vi.fn(),
      srem: vi.fn(),
      zcard: vi.fn(),
      llen: vi.fn(),
      exec: vi.fn(() => Promise.resolve([])),
    })),
    get: vi.fn(),
    zrevrank: vi.fn(),
    zcard: vi.fn(),
    zrevrange: vi.fn(),
    zrange: vi.fn(),
    llen: vi.fn(),
    keys: vi.fn(() => Promise.resolve([])),
    zrem: vi.fn(),
    setex: vi.fn(),
  },
  redisPubSub: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    on: vi.fn(),
  },
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    matchingQueue: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('QueueManagerService', () => {
  const mockRequest = {
    userId: 'user123',
    preferredSkills: ['javascript', 'react'],
    sessionType: 'learning' as const,
    maxDuration: 60,
    urgency: 'medium' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addToQueue', () => {
    it('should add user to queue with correct priority', async () => {
      const mockPipeline = {
        zadd: vi.fn(),
        lpush: vi.fn(),
        setex: vi.fn(),
        sadd: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn(() => Promise.resolve([])),
      };

      (redis.pipeline as any).mockReturnValue(mockPipeline);
      (redis.zrevrank as any).mockResolvedValue(0);
      (redis.zcard as any).mockResolvedValue(1);

      const result = await QueueManagerService.addToQueue(mockRequest);

      expect(mockPipeline.zadd).toHaveBeenCalled();
      expect(mockPipeline.lpush).toHaveBeenCalledTimes(2); // priority and session type queues
      expect(mockPipeline.setex).toHaveBeenCalled();
      expect(mockPipeline.sadd).toHaveBeenCalled();
      expect(result).toHaveProperty('position');
      expect(result).toHaveProperty('totalInQueue');
      expect(result).toHaveProperty('estimatedWaitTime');
    });

    it('should calculate priority correctly based on urgency', async () => {
      const highUrgencyRequest = { ...mockRequest, urgency: 'high' as const };
      const mockPipeline = {
        zadd: vi.fn(),
        lpush: vi.fn(),
        setex: vi.fn(),
        sadd: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn(() => Promise.resolve([])),
      };

      (redis.pipeline as any).mockReturnValue(mockPipeline);
      (redis.zrevrank as any).mockResolvedValue(0);
      (redis.zcard as any).mockResolvedValue(1);

      await QueueManagerService.addToQueue(highUrgencyRequest);

      // Check that zadd was called with a high priority score
      const zaddCall = mockPipeline.zadd.mock.calls[0];
      expect(zaddCall[1]).toBeGreaterThan(1000); // High urgency should have priority > 1000
    });

    it('should handle session type compatibility', async () => {
      const collaborationRequest = { ...mockRequest, sessionType: 'collaboration' as const };
      const mockPipeline = {
        zadd: vi.fn(),
        lpush: vi.fn(),
        setex: vi.fn(),
        sadd: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn(() => Promise.resolve([])),
      };

      (redis.pipeline as any).mockReturnValue(mockPipeline);
      (redis.zrevrank as any).mockResolvedValue(0);
      (redis.zcard as any).mockResolvedValue(1);

      await QueueManagerService.addToQueue(collaborationRequest);

      // Verify it was added to the collaboration queue
      expect(mockPipeline.lpush).toHaveBeenCalledWith(
        'queue:matching:type:collaboration',
        expect.any(String)
      );
    });
  });

  describe('removeFromQueue', () => {
    it('should remove user from all queues', async () => {
      const mockQueueData = JSON.stringify({
        id: 'user123_123456789',
        userId: 'user123',
        urgency: 'medium',
        sessionType: 'learning',
      });

      (redis.get as any).mockResolvedValue(mockQueueData);

      const mockPipeline = {
        zrem: vi.fn(),
        lrem: vi.fn(),
        del: vi.fn(),
        srem: vi.fn(),
        exec: vi.fn(() => Promise.resolve([])),
      };

      (redis.pipeline as any).mockReturnValue(mockPipeline);

      await QueueManagerService.removeFromQueue('user123');

      expect(mockPipeline.zrem).toHaveBeenCalledWith('queue:matching:main', mockQueueData);
      expect(mockPipeline.lrem).toHaveBeenCalledWith('queue:matching:priority:medium', 0, mockQueueData);
      expect(mockPipeline.lrem).toHaveBeenCalledWith('queue:matching:type:learning', 0, mockQueueData);
      expect(mockPipeline.del).toHaveBeenCalledWith('queue:user:user123');
      expect(mockPipeline.srem).toHaveBeenCalledWith('queue:active_users', 'user123');
    });

    it('should handle user not in queue gracefully', async () => {
      (redis.get as any).mockResolvedValue(null);

      await expect(QueueManagerService.removeFromQueue('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status for user', async () => {
      const mockQueueData = JSON.stringify({
        id: 'user123_123456789',
        userId: 'user123',
        urgency: 'medium',
        sessionType: 'learning',
        joinedAt: Date.now() - 60000, // 1 minute ago
      });

      (redis.get as any).mockResolvedValue(mockQueueData);
      (redis.zrevrank as any).mockResolvedValue(2); // 3rd position (0-indexed)
      (redis.zcard as any).mockResolvedValue(10);

      const status = await QueueManagerService.getQueueStatus('user123');

      expect(status.position).toBe(3); // 1-based position
      expect(status.totalInQueue).toBe(10);
      expect(status.estimatedWaitTime).toBeGreaterThan(0);
    });

    it('should throw error for user not in queue', async () => {
      (redis.get as any).mockResolvedValue(null);

      await expect(QueueManagerService.getQueueStatus('nonexistent')).rejects.toThrow('User not in queue');
    });
  });

  describe('getQueueStats', () => {
    it('should return comprehensive queue statistics', async () => {
      const mockResults = [
        [null, 15], // total in queue
        [null, 5],  // learning count
        [null, 3],  // teaching count
        [null, 7],  // collaboration count
        [null, 2],  // high urgency count
        [null, 8],  // medium urgency count
        [null, 5],  // low urgency count
      ];

      const mockPipeline = {
        zcard: vi.fn(),
        llen: vi.fn(),
        exec: vi.fn(() => Promise.resolve(mockResults)),
      };

      (redis.pipeline as any).mockReturnValue(mockPipeline);
      (redis.get as any).mockResolvedValue(JSON.stringify({ averageMatchTime: 120, matchesPerHour: 25 }));

      const stats = await QueueManagerService.getQueueStats();

      expect(stats.totalInQueue).toBe(15);
      expect(stats.bySessionType.learning).toBe(5);
      expect(stats.bySessionType.teaching).toBe(3);
      expect(stats.bySessionType.collaboration).toBe(7);
      expect(stats.byUrgency.high).toBe(2);
      expect(stats.byUrgency.medium).toBe(8);
      expect(stats.byUrgency.low).toBe(5);
      expect(stats.averageMatchTime).toBe(120);
      expect(stats.matchesPerHour).toBe(25);
    });
  });

  describe('getNextCandidates', () => {
    it('should return valid candidates excluding requester', async () => {
      const mockCandidates = [
        JSON.stringify({
          userId: 'user456',
          sessionType: 'teaching',
          expiresAt: Date.now() + 60000, // Not expired
        }),
        JSON.stringify({
          userId: 'user123', // Should be excluded
          sessionType: 'collaboration',
          expiresAt: Date.now() + 60000,
        }),
        JSON.stringify({
          userId: 'user789',
          sessionType: 'collaboration',
          expiresAt: Date.now() - 60000, // Expired - should be filtered out
        }),
      ];

      (redis.zrevrange as any).mockResolvedValue(mockCandidates);

      const candidates = await QueueManagerService.getNextCandidates('user123', 'learning', 5);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].userId).toBe('user456');
    });

    it('should filter expired entries', async () => {
      const expiredCandidate = JSON.stringify({
        userId: 'user456',
        sessionType: 'teaching',
        expiresAt: Date.now() - 60000, // Expired
      });

      (redis.zrevrange as any).mockResolvedValue([expiredCandidate]);

      const candidates = await QueueManagerService.getNextCandidates('user123', 'learning', 5);

      expect(candidates).toHaveLength(0);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should remove expired entries from all queues', async () => {
      const expiredEntry = JSON.stringify({
        userId: 'user456',
        urgency: 'medium',
        sessionType: 'learning',
        expiresAt: Date.now() - 60000, // Expired
      });

      const validEntry = JSON.stringify({
        userId: 'user789',
        urgency: 'high',
        sessionType: 'teaching',
        expiresAt: Date.now() + 60000, // Not expired
      });

      (redis.zrange as any).mockResolvedValue([expiredEntry, validEntry]);

      const mockPipeline = {
        zrem: vi.fn(),
        lrem: vi.fn(),
        del: vi.fn(),
        srem: vi.fn(),
        exec: vi.fn(() => Promise.resolve([])),
      };

      (redis.pipeline as any).mockReturnValue(mockPipeline);

      const cleanedCount = await QueueManagerService.cleanupExpiredEntries();

      expect(cleanedCount).toBe(1);
      expect(mockPipeline.zrem).toHaveBeenCalledWith('queue:matching:main', expiredEntry);
      expect(mockPipeline.lrem).toHaveBeenCalledWith('queue:matching:priority:medium', 0, expiredEntry);
    });
  });

  describe('rebalanceQueue', () => {
    it('should recalculate priorities for all entries', async () => {
      const queueData = [
        JSON.stringify({
          userId: 'user123',
          urgency: 'medium',
          sessionType: 'learning',
          joinedAt: Date.now() - 300000, // 5 minutes ago
          preferredSkills: ['javascript'],
          maxDuration: 60,
        }),
        '550', // Current score
      ];

      (redis.zrange as any).mockResolvedValue(queueData);

      const mockPipeline = {
        zadd: vi.fn(),
        zrem: vi.fn(),
        exec: vi.fn(() => Promise.resolve([])),
      };

      (redis.pipeline as any).mockReturnValue(mockPipeline);

      await QueueManagerService.rebalanceQueue();

      // Should update the score since time has passed (priority increases with wait time)
      expect(mockPipeline.zadd).toHaveBeenCalled();
    });
  });
});

describe('QueueCleanupService', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    QueueCleanupService.stop();
  });

  describe('start/stop', () => {
    it('should start cleanup intervals', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      QueueCleanupService.start();

      expect(setIntervalSpy).toHaveBeenCalledTimes(2); // cleanup and rebalance intervals
    });

    it('should stop cleanup intervals', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      QueueCleanupService.start();
      QueueCleanupService.stop();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('should not start multiple times', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      QueueCleanupService.start();
      QueueCleanupService.start(); // Second call should be ignored

      expect(setIntervalSpy).toHaveBeenCalledTimes(2); // Still only 2 intervals
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status with metrics', async () => {
      const mockHealthData = JSON.stringify({
        queueHealth: 85,
        lastCleanup: Date.now(),
      });

      (redis.get as any).mockResolvedValue(mockHealthData);

      // Mock QueueManagerService.getQueueStats
      const mockStats = {
        totalInQueue: 25,
        averageMatchTime: 150,
        matchesPerHour: 15,
        bySessionType: {},
        byUrgency: {},
      };

      vi.spyOn(QueueManagerService, 'getQueueStats').mockResolvedValue(mockStats);

      const health = await QueueCleanupService.getHealthStatus();

      expect(health.isHealthy).toBe(true);
      expect(health.metrics.queueHealth).toBe(85);
      expect(health.issues).toHaveLength(0);
    });

    it('should identify health issues', async () => {
      (redis.get as any).mockResolvedValue(null);

      const mockStats = {
        totalInQueue: 150, // High queue size
        averageMatchTime: 300, // Slow matching
        matchesPerHour: 2, // Low matching rate
        bySessionType: {},
        byUrgency: {},
      };

      vi.spyOn(QueueManagerService, 'getQueueStats').mockResolvedValue(mockStats);

      const health = await QueueCleanupService.getHealthStatus();

      expect(health.isHealthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues.some(issue => issue.includes('High queue size'))).toBe(true);
      expect(health.issues.some(issue => issue.includes('Slow matching'))).toBe(true);
      expect(health.issues.some(issue => issue.includes('Low matching rate'))).toBe(true);
    });
  });

  describe('forceCleanup', () => {
    it('should perform immediate cleanup and return results', async () => {
      vi.spyOn(QueueManagerService, 'cleanupExpiredEntries').mockResolvedValue(5);

      // Mock the private cleanupOrphanedKeys method by mocking redis.keys
      (redis.keys as any).mockResolvedValue([]);

      const result = await QueueCleanupService.forceCleanup();

      expect(result.expiredEntries).toBe(5);
      expect(result.orphanedKeys).toBe(0);
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});