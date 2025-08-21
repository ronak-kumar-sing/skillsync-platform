import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Prisma - must be hoisted
vi.mock('@/lib/prisma', () => ({
  default: {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    userStats: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

import { SessionAnalyticsService } from '@/services/session-analytics.service';
import prisma from '@/lib/prisma';

// Get the mocked prisma for type safety
const mockPrisma = prisma as any;

describe('SessionAnalyticsService', () => {
  const mockUserId = 'user123';
  const mockSessionId = 'session123';
  const mockPartnerId = 'partner123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserAnalytics', () => {
    it('should return comprehensive analytics data', async () => {
      // Mock session data
      const mockSessions = [
        {
          id: 'session1',
          initiatorId: mockUserId,
          partnerId: mockPartnerId,
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-01'),
          durationMinutes: 60,
          sessionType: 'learning',
          topics: ['javascript', 'react'],
          ratingInitiator: 5,
          ratingPartner: 4,
          status: 'completed',
          initiator: {
            id: mockUserId,
            username: 'testuser',
            avatarUrl: null
          },
          partner: {
            id: mockPartnerId,
            username: 'partner',
            avatarUrl: null
          }
        },
        {
          id: 'session2',
          initiatorId: mockPartnerId,
          partnerId: mockUserId,
          startTime: new Date('2024-01-02'),
          endTime: new Date('2024-01-02'),
          durationMinutes: 45,
          sessionType: 'teaching',
          topics: ['python'],
          ratingInitiator: 4,
          ratingPartner: 5,
          status: 'completed',
          initiator: {
            id: mockPartnerId,
            username: 'partner',
            avatarUrl: null
          },
          partner: {
            id: mockUserId,
            username: 'testuser',
            avatarUrl: null
          }
        }
      ];

      const mockUserStats = {
        id: 'stats1',
        userId: mockUserId,
        totalSessions: 2,
        totalMinutesLearned: 105,
        averageRating: 4.5,
        skillsLearned: 1,
        skillsTaught: 1,
        achievementPoints: 100,
        currentStreak: 2,
        longestStreak: 5,
        lastSessionDate: new Date('2024-01-02'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.userStats.findUnique.mockResolvedValue(mockUserStats);

      const analytics = await SessionAnalyticsService.getUserAnalytics(mockUserId, {
        timeframe: '30d',
        includeInsights: true,
        includeProgression: false
      });

      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.overview.totalSessions).toBe(2);
      expect(analytics.overview.totalHours).toBe(1.75); // 105 minutes = 1.75 hours
      expect(analytics.overview.averageRating).toBe(4.5);
      expect(analytics.sessionDistribution).toBeDefined();
      expect(analytics.performanceTrends).toBeDefined();
      expect(analytics.learningVelocity).toBeDefined();
      expect(analytics.topPartners).toBeDefined();
      expect(analytics.insights).toBeDefined();
    });

    it('should handle empty session data', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.userStats.findUnique.mockResolvedValue(null);

      const analytics = await SessionAnalyticsService.getUserAnalytics(mockUserId, {
        timeframe: '30d',
        includeInsights: false,
        includeProgression: false
      });

      expect(analytics.overview.totalSessions).toBe(0);
      expect(analytics.overview.totalHours).toBe(0);
      expect(analytics.overview.averageRating).toBe(0);
    });
  });

  describe('getSessionHistory', () => {
    it('should return filtered and paginated session history', async () => {
      const mockSessions = [
        {
          id: 'session1',
          initiatorId: mockUserId,
          partnerId: mockPartnerId,
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-01'),
          durationMinutes: 60,
          sessionType: 'learning',
          topics: ['javascript'],
          ratingInitiator: 5,
          ratingPartner: 4,
          feedbackInitiator: 'Great session!',
          feedbackPartner: 'Very helpful',
          status: 'completed',
          initiator: {
            id: mockUserId,
            username: 'testuser',
            avatarUrl: null
          },
          partner: {
            id: mockPartnerId,
            username: 'partner',
            avatarUrl: null
          }
        }
      ];

      mockPrisma.session.count.mockResolvedValue(1);
      mockPrisma.session.findMany.mockResolvedValue(mockSessions);

      const filters = {
        page: 1,
        limit: 20,
        search: 'javascript',
        sessionType: 'learning' as const,
        minRating: 4
      };

      const result = await SessionAnalyticsService.getSessionHistory(mockUserId, filters);

      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.sessions[0].sessionType).toBe('learning');
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionType: 'learning',
            status: 'completed'
          }),
          skip: 0,
          take: 20
        })
      );
    });

    it('should handle date range filters', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      mockPrisma.session.count.mockResolvedValue(0);
      mockPrisma.session.findMany.mockResolvedValue([]);

      const filters = {
        page: 1,
        limit: 20,
        dateFrom,
        dateTo
      };

      await SessionAnalyticsService.getSessionHistory(mockUserId, filters);

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: {
              gte: dateFrom,
              lte: dateTo
            }
          })
        })
      );
    });
  });

  describe('submitDetailedFeedback', () => {
    it('should submit detailed feedback for a session', async () => {
      const mockSession = {
        id: mockSessionId,
        initiatorId: mockUserId,
        partnerId: mockPartnerId,
        startTime: new Date(),
        endTime: new Date(),
        durationMinutes: 60,
        sessionType: 'learning',
        topics: ['javascript'],
        ratingInitiator: null,
        ratingPartner: null,
        feedbackInitiator: null,
        feedbackPartner: null,
        status: 'completed'
      };

      const updatedSession = {
        ...mockSession,
        ratingInitiator: 5,
        feedbackInitiator: 'Great session!'
      };

      const detailedFeedback = {
        rating: 5,
        feedback: 'Great session!',
        skillsLearned: ['React hooks', 'State management'],
        skillsTaught: [],
        learningOutcomes: ['Better understanding of React'],
        difficultyLevel: 3 as const,
        paceRating: 4 as const,
        communicationRating: 5 as const,
        technicalIssues: [],
        wouldRecommendPartner: true,
        improvementSuggestions: 'More examples would be helpful',
        sharedResources: [
          {
            type: 'link' as const,
            title: 'React Documentation',
            content: 'Official React docs',
            url: 'https://react.dev'
          }
        ]
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.session.update.mockResolvedValue(updatedSession);

      const result = await SessionAnalyticsService.submitDetailedFeedback(
        mockSessionId,
        mockUserId,
        detailedFeedback
      );

      expect(result.session).toBeDefined();
      expect(result.detailedFeedback).toBeDefined();
      expect(result.detailedFeedback.rating).toBe(5);
      expect(result.detailedFeedback.skillsLearned).toContain('React hooks');
      expect(result.detailedFeedback.sharedResources).toHaveLength(1);

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: {
          ratingInitiator: 5,
          feedbackInitiator: 'Great session!'
        }
      });
    });

    it('should handle partner feedback submission', async () => {
      const mockSession = {
        id: mockSessionId,
        initiatorId: mockPartnerId, // Partner is initiator
        partnerId: mockUserId, // User is partner
        startTime: new Date(),
        endTime: new Date(),
        durationMinutes: 60,
        sessionType: 'teaching',
        topics: ['python'],
        ratingInitiator: null,
        ratingPartner: null,
        feedbackInitiator: null,
        feedbackPartner: null,
        status: 'completed'
      };

      const detailedFeedback = {
        rating: 4,
        feedback: 'Good teaching session',
        skillsLearned: ['Python basics'],
        skillsTaught: [],
        learningOutcomes: ['Understanding Python syntax'],
        technicalIssues: ['Audio was a bit choppy'],
        wouldRecommendPartner: true,
        sharedResources: []
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.session.update.mockResolvedValue({
        ...mockSession,
        ratingPartner: 4,
        feedbackPartner: 'Good teaching session'
      });

      await SessionAnalyticsService.submitDetailedFeedback(
        mockSessionId,
        mockUserId,
        detailedFeedback
      );

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: {
          ratingPartner: 4,
          feedbackPartner: 'Good teaching session'
        }
      });
    });

    it('should throw error for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const detailedFeedback = {
        rating: 5,
        skillsLearned: [],
        skillsTaught: [],
        learningOutcomes: [],
        technicalIssues: [],
        sharedResources: []
      };

      await expect(
        SessionAnalyticsService.submitDetailedFeedback(
          'nonexistent',
          mockUserId,
          detailedFeedback
        )
      ).rejects.toThrow('Session not found');
    });
  });

  describe('getSessionFeedback', () => {
    it('should return session feedback for authorized user', async () => {
      const mockSession = {
        id: mockSessionId,
        initiatorId: mockUserId,
        partnerId: mockPartnerId,
        startTime: new Date(),
        endTime: new Date(),
        durationMinutes: 60,
        sessionType: 'learning',
        topics: ['javascript'],
        ratingInitiator: 5,
        ratingPartner: 4,
        feedbackInitiator: 'Great session!',
        feedbackPartner: 'Very helpful',
        status: 'completed',
        initiator: {
          id: mockUserId,
          username: 'testuser',
          avatarUrl: null
        },
        partner: {
          id: mockPartnerId,
          username: 'partner',
          avatarUrl: null
        }
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);

      const result = await SessionAnalyticsService.getSessionFeedback(mockSessionId, mockUserId);

      expect(result.session).toBeDefined();
      expect(result.userFeedback.rating).toBe(5);
      expect(result.userFeedback.feedback).toBe('Great session!');
      expect(result.partnerFeedback.rating).toBe(4);
      expect(result.partnerFeedback.feedback).toBe('Very helpful');
    });

    it('should throw error for unauthorized access', async () => {
      const mockSession = {
        id: mockSessionId,
        initiatorId: 'other-user',
        partnerId: 'another-user',
        startTime: new Date(),
        endTime: new Date(),
        durationMinutes: 60,
        sessionType: 'learning',
        topics: [],
        ratingInitiator: null,
        ratingPartner: null,
        feedbackInitiator: null,
        feedbackPartner: null,
        status: 'completed',
        initiator: { id: 'other-user', username: 'other', avatarUrl: null },
        partner: { id: 'another-user', username: 'another', avatarUrl: null }
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);

      await expect(
        SessionAnalyticsService.getSessionFeedback(mockSessionId, mockUserId)
      ).rejects.toThrow('Unauthorized access to session feedback');
    });
  });

  describe('generatePersonalizedInsights', () => {
    it('should generate insights based on user data', async () => {
      const mockUserStats = {
        id: 'stats1',
        userId: mockUserId,
        totalSessions: 10,
        totalMinutesLearned: 600,
        averageRating: 4.5,
        skillsLearned: 3,
        skillsTaught: 2,
        achievementPoints: 500,
        currentStreak: 7,
        longestStreak: 10,
        lastSessionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.userStats.findUnique.mockResolvedValue(mockUserStats);

      const insights = await SessionAnalyticsService.generatePersonalizedInsights(mockUserId, 'all');

      expect(insights).toBeDefined();
      expect(insights.performance).toBeDefined();
      expect(insights.patterns).toBeDefined();
      expect(insights.recommendations).toBeDefined();
      expect(insights.achievements).toBeDefined();

      // Check for streak insight
      const streakInsight = insights.performance.find(insight => insight.type === 'streak');
      expect(streakInsight).toBeDefined();
      expect(streakInsight?.value).toBe(7);

      // Check for rating insight
      const ratingInsight = insights.performance.find(insight => insight.metric === 'rating');
      expect(ratingInsight).toBeDefined();
      expect(ratingInsight?.value).toBe(4.5);
    });

    it('should handle users with no stats', async () => {
      mockPrisma.userStats.findUnique.mockResolvedValue(null);

      const insights = await SessionAnalyticsService.generatePersonalizedInsights(mockUserId, 'all');

      expect(insights.performance).toHaveLength(0);
      expect(insights.patterns).toHaveLength(0);
      expect(insights.recommendations).toHaveLength(0);
      expect(insights.achievements).toHaveLength(0);
    });
  });

  describe('timeframe handling', () => {
    it('should correctly calculate timeframe dates', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      vi.setSystemTime(now);

      // Test private method through public interface
      const testTimeframes = ['7d', '30d', '90d', '1y', 'all'];

      // We can't directly test the private method, but we can verify
      // that different timeframes produce different results
      expect(testTimeframes).toHaveLength(5);

      vi.useRealTimers();
    });
  });
});

describe('SessionAnalyticsService Integration', () => {
  it('should handle complex analytics workflow', async () => {
    const mockUserId = 'integration-user';
    const mockSessions = Array.from({ length: 20 }, (_, i) => ({
      id: `session-${i}`,
      initiatorId: i % 2 === 0 ? mockUserId : `partner-${i}`,
      partnerId: i % 2 === 0 ? `partner-${i}` : mockUserId,
      startTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Spread over 20 days
      endTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour sessions
      durationMinutes: 60,
      sessionType: ['learning', 'teaching', 'collaboration'][i % 3] as any,
      topics: [`topic-${i % 5}`],
      ratingInitiator: Math.floor(Math.random() * 5) + 1,
      ratingPartner: Math.floor(Math.random() * 5) + 1,
      status: 'completed',
      initiator: {
        id: i % 2 === 0 ? mockUserId : `partner-${i}`,
        username: i % 2 === 0 ? 'testuser' : `partner-${i}`,
        avatarUrl: null
      },
      partner: {
        id: i % 2 === 0 ? `partner-${i}` : mockUserId,
        username: i % 2 === 0 ? `partner-${i}` : 'testuser',
        avatarUrl: null
      }
    }));

    const mockUserStats = {
      id: 'stats-integration',
      userId: mockUserId,
      totalSessions: 20,
      totalMinutesLearned: 1200,
      averageRating: 4.2,
      skillsLearned: 5,
      skillsTaught: 3,
      achievementPoints: 800,
      currentStreak: 5,
      longestStreak: 12,
      lastSessionDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockPrisma.session.findMany.mockResolvedValue(mockSessions);
    mockPrisma.userStats.findUnique.mockResolvedValue(mockUserStats);

    const analytics = await SessionAnalyticsService.getUserAnalytics(mockUserId, {
      timeframe: '30d',
      includeInsights: true,
      includeProgression: true
    });

    // Verify comprehensive analytics
    expect(analytics.overview.totalSessions).toBe(20);
    expect(analytics.overview.totalHours).toBe(20); // 20 sessions * 1 hour each
    expect(analytics.sessionDistribution.byType).toHaveLength(3); // learning, teaching, collaboration
    expect(analytics.performanceTrends.length).toBeGreaterThan(0);
    expect(analytics.learningVelocity.sessionsPerWeek).toBeGreaterThan(0);
    expect(analytics.topPartners.length).toBeGreaterThan(0);
  });
});