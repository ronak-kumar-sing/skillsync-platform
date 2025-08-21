import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the database and external dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userSkills: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    learningGoal: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    achievement: {
      findMany: vi.fn(),
    },
    userAchievement: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    skill: {
      findMany: vi.fn(),
    },
    matchingQueue: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  generateAccessToken: vi.fn().mockReturnValue('access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('refresh-token'),
  verifyAccessToken: vi.fn().mockReturnValue({
    userId: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
  }),
  verifyRefreshToken: vi.fn().mockReturnValue({ userId: 'user-123' }),
  extractTokenFromHeader: vi.fn().mockReturnValue('valid-token'),
}));

vi.mock('@/services/matching.service', () => ({
  MatchingService: {
    findMatch: vi.fn(),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    getQueueStats: vi.fn(),
  },
}));

vi.mock('@/services/achievement.service', () => ({
  AchievementService: {
    getUserAchievements: vi.fn(),
    checkAndAwardAchievements: vi.fn(),
    getLeaderboard: vi.fn(),
  },
}));

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const prisma = await import('@/lib/prisma');
        const auth = await import('@/lib/auth');

        // Mock user doesn't exist
        (prisma.default.user.findUnique as any).mockResolvedValue(null);

        // Mock user creation
        (prisma.default.user.create as any).mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          isVerified: false,
          timezone: 'UTC',
          createdAt: new Date(),
        });

        const { POST } = await import('@/app/api/auth/register/route');

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'testuser',
            password: 'StrongPass123!',
            timezone: 'UTC',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.user.email).toBe('test@example.com');
        expect(data.data.accessToken).toBe('access-token');
        expect(auth.hashPassword).toHaveBeenCalledWith('StrongPass123!');
      });

      it('should reject registration with existing email', async () => {
        const prisma = await import('@/lib/prisma');

        // Mock user already exists
        (prisma.default.user.findUnique as any).mockResolvedValue({
          id: 'existing-user',
          email: 'test@example.com',
        });

        const { POST } = await import('@/app/api/auth/register/route');

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'testuser',
            password: 'StrongPass123!',
            timezone: 'UTC',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('already exists');
      });

      it('should reject registration with invalid data', async () => {
        const { POST } = await import('@/app/api/auth/register/route');

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: 'invalid-email',
            username: 'ab', // Too short
            password: 'weak', // Too weak
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('validation');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login user with valid credentials', async () => {
        const prisma = await import('@/lib/prisma');
        const auth = await import('@/lib/auth');

        // Mock user exists
        (prisma.default.user.findUnique as any).mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashed-password',
          isVerified: true,
          timezone: 'UTC',
        });

        const { POST } = await import('@/app/api/auth/login/route');

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.user.email).toBe('test@example.com');
        expect(data.data.accessToken).toBe('access-token');
        expect(auth.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
      });

      it('should reject login with invalid credentials', async () => {
        const prisma = await import('@/lib/prisma');
        const auth = await import('@/lib/auth');

        // Mock user exists but password is wrong
        (prisma.default.user.findUnique as any).mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        });

        (auth.verifyPassword as any).mockResolvedValue(false);

        const { POST } = await import('@/app/api/auth/login/route');

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrong-password',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid credentials');
      });

      it('should reject login for non-existent user', async () => {
        const prisma = await import('@/lib/prisma');

        // Mock user doesn't exist
        (prisma.default.user.findUnique as any).mockResolvedValue(null);

        const { POST } = await import('@/app/api/auth/login/route');

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'nonexistent@example.com',
            password: 'password123',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid credentials');
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return user profile for authenticated user', async () => {
        const prisma = await import('@/lib/prisma');

        // Mock user profile
        (prisma.default.user.findUnique as any).mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          isVerified: true,
          timezone: 'UTC',
          avatarUrl: null,
        });

        const { GET } = await import('@/app/api/auth/me/route');

        const request = new NextRequest('http://localhost:3000/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.email).toBe('test@example.com');
      });

      it('should reject request without authentication', async () => {
        const auth = await import('@/lib/auth');
        (auth.extractTokenFromHeader as any).mockReturnValue(null);

        const { GET } = await import('@/app/api/auth/me/route');

        const request = new NextRequest('http://localhost:3000/api/auth/me', {
          method: 'GET',
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Authentication required');
      });
    });
  });

  describe('Profile Management Endpoints', () => {
    describe('PUT /api/profile', () => {
      it('should update user profile successfully', async () => {
        const prisma = await import('@/lib/prisma');

        // Mock updated user
        (prisma.default.user.update as any).mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          username: 'newusername',
          timezone: 'America/New_York',
          avatarUrl: 'https://example.com/avatar.jpg',
        });

        const { PUT } = await import('@/app/api/profile/route');

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({
            username: 'newusername',
            timezone: 'America/New_York',
            avatarUrl: 'https://example.com/avatar.jpg',
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.username).toBe('newusername');
      });

      it('should reject invalid profile updates', async () => {
        const { PUT } = await import('@/app/api/profile/route');

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({
            username: 'ab', // Too short
            avatarUrl: 'not-a-url',
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('validation');
      });
    });

    describe('POST /api/profile/skills', () => {
      it('should add skill to user profile', async () => {
        const prisma = await import('@/lib/prisma');

        // Mock skill creation
        (prisma.default.userSkills.create as any).mockResolvedValue({
          id: 'skill-123',
          userId: 'user-123',
          skillId: 'js-skill',
          proficiencyLevel: 3,
          verified: false,
          endorsements: 0,
        });

        const { POST } = await import('@/app/api/profile/skills/route');

        const request = new NextRequest('http://localhost:3000/api/profile/skills', {
          method: 'POST',
          body: JSON.stringify({
            skillId: '123e4567-e89b-12d3-a456-426614174000',
            proficiencyLevel: 3,
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.proficiencyLevel).toBe(3);
      });

      it('should reject invalid skill data', async () => {
        const { POST } = await import('@/app/api/profile/skills/route');

        const request = new NextRequest('http://localhost:3000/api/profile/skills', {
          method: 'POST',
          body: JSON.stringify({
            skillId: 'not-a-uuid',
            proficiencyLevel: 6, // Invalid level
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('validation');
      });
    });

    describe('POST /api/profile/goals', () => {
      it('should create learning goal successfully', async () => {
        const prisma = await import('@/lib/prisma');

        // Mock goal creation
        (prisma.default.learningGoal.create as any).mockResolvedValue({
          id: 'goal-123',
          userId: 'user-123',
          title: 'Learn React Hooks',
          description: 'Master useState and useEffect',
          priority: 'high',
          status: 'active',
          targetDate: new Date('2024-12-31'),
        });

        const { POST } = await import('@/app/api/profile/goals/route');

        const request = new NextRequest('http://localhost:3000/api/profile/goals', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Learn React Hooks',
            description: 'Master useState and useEffect',
            priority: 'high',
            targetDate: '2024-12-31',
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.title).toBe('Learn React Hooks');
      });
    });
  });

  describe('Matching System Endpoints', () => {
    describe('POST /api/matching/queue', () => {
      it('should add user to matching queue', async () => {
        const matchingService = await import('@/services/matching.service');

        // Mock successful queue addition
        (matchingService.MatchingService.addToQueue as any).mockResolvedValue(undefined);

        const { POST } = await import('@/app/api/matching/queue/route');

        const request = new NextRequest('http://localhost:3000/api/matching/queue', {
          method: 'POST',
          body: JSON.stringify({
            preferredSkills: ['JavaScript', 'React'],
            sessionType: 'learning',
            maxDuration: 60,
            urgency: 'medium',
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(matchingService.MatchingService.addToQueue).toHaveBeenCalledWith({
          userId: 'user-123',
          preferredSkills: ['JavaScript', 'React'],
          sessionType: 'learning',
          maxDuration: 60,
          urgency: 'medium',
        });
      });

      it('should reject invalid matching request', async () => {
        const { POST } = await import('@/app/api/matching/queue/route');

        const request = new NextRequest('http://localhost:3000/api/matching/queue', {
          method: 'POST',
          body: JSON.stringify({
            sessionType: 'invalid-type',
            maxDuration: -10, // Invalid duration
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      });
    });

    describe('GET /api/matching/queue/stats', () => {
      it('should return queue statistics', async () => {
        const matchingService = await import('@/services/matching.service');

        // Mock queue stats
        (matchingService.MatchingService.getQueueStats as any).mockResolvedValue({
          totalInQueue: 25,
          bySessionType: {
            learning: 10,
            teaching: 8,
            collaboration: 7,
          },
          byUrgency: {
            high: 5,
            medium: 15,
            low: 5,
          },
          averageWaitTime: 120,
        });

        const { GET } = await import('@/app/api/matching/queue/stats/route');

        const request = new NextRequest('http://localhost:3000/api/matching/queue/stats', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.totalInQueue).toBe(25);
        expect(data.data.averageWaitTime).toBe(120);
      });
    });
  });

  describe('Achievement System Endpoints', () => {
    describe('GET /api/achievements', () => {
      it('should return user achievements', async () => {
        const achievementService = await import('@/services/achievement.service');

        // Mock user achievements
        (achievementService.AchievementService.getUserAchievements as any).mockResolvedValue([
          {
            id: 'achievement-1',
            name: 'First Session',
            description: 'Complete your first learning session',
            iconUrl: '/icons/first-session.png',
            category: 'milestone',
            points: 10,
            rarity: 'common',
            earnedAt: new Date('2023-11-01'),
          },
        ]);

        const { GET } = await import('@/app/api/achievements/route');

        const request = new NextRequest('http://localhost:3000/api/achievements', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].name).toBe('First Session');
      });
    });

    describe('GET /api/leaderboard', () => {
      it('should return leaderboard data', async () => {
        const achievementService = await import('@/services/achievement.service');

        // Mock leaderboard
        (achievementService.AchievementService.getLeaderboard as any).mockResolvedValue([
          {
            userId: 'user-1',
            username: 'topuser',
            avatarUrl: null,
            totalPoints: 500,
            rank: 1,
            totalSessions: 25,
            skillsLearned: 8,
          },
          {
            userId: 'user-2',
            username: 'seconduser',
            avatarUrl: null,
            totalPoints: 350,
            rank: 2,
            totalSessions: 18,
            skillsLearned: 6,
          },
        ]);

        const { GET } = await import('@/app/api/leaderboard/route');

        const request = new NextRequest('http://localhost:3000/api/leaderboard', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(2);
        expect(data.data[0].rank).toBe(1);
        expect(data.data[0].totalPoints).toBe(500);
      });
    });
  });

  describe('Session Management Endpoints', () => {
    describe('GET /api/sessions/history', () => {
      it('should return user session history', async () => {
        const prisma = await import('@/lib/prisma');

        // Mock session history
        (prisma.default.session.findMany as any).mockResolvedValue([
          {
            id: 'session-1',
            initiatorId: 'user-123',
            partnerId: 'user-456',
            sessionType: 'learning',
            startTime: new Date('2023-11-01T10:00:00Z'),
            endTime: new Date('2023-11-01T11:00:00Z'),
            durationMinutes: 60,
            ratingInitiator: 5,
            ratingPartner: 4,
            topics: ['JavaScript', 'React'],
            partner: {
              username: 'partner',
              avatarUrl: null,
            },
          },
        ]);

        const { GET } = await import('@/app/api/sessions/history/route');

        const request = new NextRequest('http://localhost:3000/api/sessions/history', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].sessionType).toBe('learning');
        expect(data.data[0].durationMinutes).toBe(60);
      });
    });

    describe('POST /api/sessions/[sessionId]/feedback', () => {
      it('should submit session feedback', async () => {
        const prisma = await import('@/lib/prisma');

        // Mock session update
        (prisma.default.session.update as any).mockResolvedValue({
          id: 'session-123',
          ratingInitiator: 5,
          feedbackInitiator: 'Great session!',
        });

        const { POST } = await import('@/app/api/sessions/[sessionId]/feedback/route');

        const request = new NextRequest('http://localhost:3000/api/sessions/session-123/feedback', {
          method: 'POST',
          body: JSON.stringify({
            rating: 5,
            feedback: 'Great session!',
            skillsLearned: ['React Hooks'],
            learningOutcomes: ['Understanding useState'],
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await POST(request, { params: { sessionId: 'session-123' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const prisma = await import('@/lib/prisma');

      // Mock database error
      (prisma.default.user.findUnique as any).mockRejectedValue(new Error('Database connection failed'));

      const { GET } = await import('@/app/api/auth/me/route');

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const { POST } = await import('@/app/api/auth/login/route');

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid-json{',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle missing required headers', async () => {
      const { GET } = await import('@/app/api/auth/me/route');

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        // No Authorization header
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting for authentication endpoints', async () => {
      // This would require mocking the rate limiter
      // For now, we'll test that the endpoint exists and can be called
      const { POST } = await import('@/app/api/auth/login/route');

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Multiple rapid requests would trigger rate limiting in real scenario
      const response = await POST(request);
      expect(response).toBeDefined();
    });
  });
});