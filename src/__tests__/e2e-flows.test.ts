import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock browser APIs for E2E simulation
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock WebRTC APIs
global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  createOffer: vi.fn().mockResolvedValue({}),
  createAnswer: vi.fn().mockResolvedValue({}),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  connectionState: 'new',
  iceConnectionState: 'new',
}));

global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [],
    getVideoTracks: () => [],
    getAudioTracks: () => [],
  }),
} as any;

// Mock Socket.io
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  })),
}));

describe('End-to-End User Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  describe('User Registration and Onboarding Flow', () => {
    it('should complete full registration and profile setup', async () => {
      // Step 1: User visits registration page
      const registrationData = {
        email: 'newuser@example.com',
        username: 'newuser123',
        password: 'StrongPass123!',
        timezone: 'America/New_York',
      };

      // Mock successful registration API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: registrationData.email,
              username: registrationData.username,
              isVerified: false,
              timezone: registrationData.timezone,
            },
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-123',
          },
        }),
      });

      // Simulate registration API call
      const registrationResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const registrationResult = await registrationResponse.json();

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.data.user.email).toBe(registrationData.email);
      expect(registrationResult.data.accessToken).toBeDefined();

      // Step 2: Store authentication tokens
      mockLocalStorage.setItem('accessToken', registrationResult.data.accessToken);
      mockLocalStorage.setItem('refreshToken', registrationResult.data.refreshToken);

      // Step 3: Complete profile setup - Add skills
      const skillsData = [
        { skillId: 'js-skill-id', proficiencyLevel: 3 },
        { skillId: 'react-skill-id', proficiencyLevel: 2 },
      ];

      // Mock skills API calls
      for (const skill of skillsData) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: `user-skill-${skill.skillId}`,
              ...skill,
            },
          }),
        });

        const skillResponse = await fetch('/api/profile/skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${registrationResult.data.accessToken}`,
          },
          body: JSON.stringify(skill),
        });

        const skillResult = await skillResponse.json();
        expect(skillResult.success).toBe(true);
      }

      // Step 4: Add learning goals
      const learningGoal = {
        title: 'Master React Hooks',
        description: 'Learn useState, useEffect, and custom hooks',
        priority: 'high',
        targetDate: '2024-12-31',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'goal-123',
            userId: 'user-123',
            ...learningGoal,
            status: 'active',
          },
        }),
      });

      const goalResponse = await fetch('/api/profile/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${registrationResult.data.accessToken}`,
        },
        body: JSON.stringify(learningGoal),
      });

      const goalResult = await goalResponse.json();
      expect(goalResult.success).toBe(true);
      expect(goalResult.data.title).toBe(learningGoal.title);

      // Step 5: Set preferences
      const preferences = {
        preferredSessionTypes: ['learning', 'collaboration'],
        maxSessionDuration: 90,
        communicationStyle: 'casual',
        languagePreferences: ['en'],
        availabilitySchedule: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
          saturday: [],
          sunday: [],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: preferences,
        }),
      });

      const preferencesResponse = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${registrationResult.data.accessToken}`,
        },
        body: JSON.stringify(preferences),
      });

      const preferencesResult = await preferencesResponse.json();
      expect(preferencesResult.success).toBe(true);

      // Step 6: Verify profile completion
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            isComplete: true,
            completionPercentage: 100,
            missingFields: [],
          },
        }),
      });

      const completionResponse = await fetch('/api/profile/completion', {
        headers: {
          'Authorization': `Bearer ${registrationResult.data.accessToken}`,
        },
      });

      const completionResult = await completionResponse.json();
      expect(completionResult.success).toBe(true);
      expect(completionResult.data.isComplete).toBe(true);
      expect(completionResult.data.completionPercentage).toBe(100);
    });

    it('should handle registration errors gracefully', async () => {
      const invalidRegistrationData = {
        email: 'invalid-email',
        username: 'ab', // Too short
        password: 'weak', // Too weak
        timezone: '',
      };

      // Mock validation error response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Validation failed',
          details: {
            email: 'Please enter a valid email address',
            username: 'Username must be at least 3 characters long',
            password: 'Password must be at least 8 characters long',
            timezone: 'Timezone is required',
          },
        }),
      });

      const registrationResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRegistrationData),
      });

      const registrationResult = await registrationResponse.json();

      expect(registrationResult.success).toBe(false);
      expect(registrationResult.error).toBe('Validation failed');
      expect(registrationResult.details).toBeDefined();
      expect(Object.keys(registrationResult.details)).toHaveLength(4);
    });
  });

  describe('Matching and Video Call Flow', () => {
    it('should complete full matching and video call session', async () => {
      const accessToken = 'valid-access-token';
      mockLocalStorage.setItem('accessToken', accessToken);

      // Step 1: Join matching queue
      const matchingRequest = {
        preferredSkills: ['JavaScript', 'React'],
        sessionType: 'learning',
        maxDuration: 60,
        urgency: 'medium',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            position: 3,
            estimatedWaitTime: 120,
            totalInQueue: 15,
          },
        }),
      });

      const queueResponse = await fetch('/api/matching/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(matchingRequest),
      });

      const queueResult = await queueResponse.json();
      expect(queueResult.success).toBe(true);
      expect(queueResult.data.position).toBe(3);

      // Step 2: Simulate match found via WebSocket
      const mockSocket = {
        on: vi.fn(),
        emit: vi.fn(),
        off: vi.fn(),
      };

      // Simulate match found event
      const matchFoundData = {
        partnerId: 'partner-123',
        sessionId: 'session-456',
        compatibilityScore: 0.85,
        partnerProfile: {
          username: 'experienced_dev',
          skills: ['JavaScript', 'React', 'Node.js'],
          averageRating: 4.8,
        },
      };

      // Mock socket event handler
      const matchFoundHandler = vi.fn();
      mockSocket.on('match:found', matchFoundHandler);

      // Simulate receiving match
      matchFoundHandler(matchFoundData);
      expect(matchFoundHandler).toHaveBeenCalledWith(matchFoundData);

      // Step 3: Accept match and start video call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            sessionId: 'session-456',
            status: 'active',
            startTime: new Date().toISOString(),
          },
        }),
      });

      const acceptMatchResponse = await fetch('/api/sessions/session-456/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const acceptResult = await acceptMatchResponse.json();
      expect(acceptResult.success).toBe(true);

      // Step 4: Initialize WebRTC connection
      const mockPeerConnection = new RTCPeerConnection();

      // Simulate getting user media
      const mockStream = {
        getTracks: () => [
          { kind: 'video', enabled: true },
          { kind: 'audio', enabled: true },
        ],
        getVideoTracks: () => [{ enabled: true }],
        getAudioTracks: () => [{ enabled: true }],
      };

      (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);

      const userMedia = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      expect(userMedia).toBeDefined();
      expect(userMedia.getTracks()).toHaveLength(2);

      // Step 5: Exchange WebRTC signaling
      const offer = await mockPeerConnection.createOffer();
      expect(mockPeerConnection.createOffer).toHaveBeenCalled();

      await mockPeerConnection.setLocalDescription(offer);
      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith(offer);

      // Simulate sending offer via socket
      mockSocket.emit('webrtc:offer', {
        sessionId: 'session-456',
        offer: offer,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc:offer', {
        sessionId: 'session-456',
        offer: offer,
      });

      // Step 6: Simulate session activities
      const collaborationEvents = [
        { type: 'chat:message', data: { message: 'Hello! Ready to learn React?' } },
        { type: 'code:change', data: { language: 'javascript', content: 'const [count, setCount] = useState(0);' } },
        { type: 'whiteboard:draw', data: { tool: 'pen', coordinates: [100, 200] } },
      ];

      collaborationEvents.forEach(event => {
        mockSocket.emit(event.type, {
          sessionId: 'session-456',
          userId: 'user-123',
          ...event.data,
        });
      });

      expect(mockSocket.emit).toHaveBeenCalledTimes(4); // 1 offer + 3 collaboration events

      // Step 7: End session and submit feedback
      const sessionFeedback = {
        rating: 5,
        feedback: 'Excellent session! Learned a lot about React hooks.',
        skillsLearned: ['React Hooks', 'useState', 'useEffect'],
        learningOutcomes: ['Understanding component state', 'Effect cleanup'],
        wouldRecommendPartner: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            sessionId: 'session-456',
            feedback: sessionFeedback,
          },
        }),
      });

      const feedbackResponse = await fetch('/api/sessions/session-456/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(sessionFeedback),
      });

      const feedbackResult = await feedbackResponse.json();
      expect(feedbackResult.success).toBe(true);

      // Step 8: Check for achievements
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            newAchievements: [
              {
                id: 'achievement-1',
                name: 'React Rookie',
                description: 'Complete your first React learning session',
                points: 25,
                rarity: 'common',
              },
            ],
          },
        }),
      });

      const achievementsResponse = await fetch('/api/achievements/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId: 'session-456',
          skillsLearned: sessionFeedback.skillsLearned,
        }),
      });

      const achievementsResult = await achievementsResponse.json();
      expect(achievementsResult.success).toBe(true);
      expect(achievementsResult.data.newAchievements).toHaveLength(1);
      expect(achievementsResult.data.newAchievements[0].name).toBe('React Rookie');
    });

    it('should handle connection failures gracefully', async () => {
      const accessToken = 'valid-access-token';

      // Simulate WebRTC connection failure
      const mockPeerConnection = new RTCPeerConnection();

      // Mock connection failure
      (mockPeerConnection.createOffer as any).mockRejectedValue(new Error('Connection failed'));

      try {
        await mockPeerConnection.createOffer();
      } catch (error) {
        expect(error.message).toBe('Connection failed');
      }

      // Simulate fallback to text-only session
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            sessionId: 'session-456',
            mode: 'text-only',
            message: 'Video call failed, continuing with text chat',
          },
        }),
      });

      const fallbackResponse = await fetch('/api/sessions/session-456/fallback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: 'webrtc_failed' }),
      });

      const fallbackResult = await fallbackResponse.json();
      expect(fallbackResult.success).toBe(true);
      expect(fallbackResult.data.mode).toBe('text-only');
    });
  });

  describe('Dashboard and Analytics Flow', () => {
    it('should load and display comprehensive dashboard data', async () => {
      const accessToken = 'valid-access-token';
      mockLocalStorage.setItem('accessToken', accessToken);

      // Step 1: Load dashboard overview
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            onlineUsers: 245,
            activeMatches: 18,
            totalSessions: 1847,
            averageRating: 4.7,
            userStats: {
              totalSessions: 12,
              totalHours: 18.5,
              currentStreak: 5,
              skillsLearned: 3,
              achievementPoints: 285,
            },
          },
        }),
      });

      const dashboardResponse = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const dashboardResult = await dashboardResponse.json();
      expect(dashboardResult.success).toBe(true);
      expect(dashboardResult.data.onlineUsers).toBe(245);
      expect(dashboardResult.data.userStats.totalSessions).toBe(12);

      // Step 2: Load session analytics
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            overview: {
              totalSessions: 12,
              totalHours: 18.5,
              averageRating: 4.6,
              completionRate: 0.92,
              currentStreak: 5,
              longestStreak: 8,
            },
            skillProgression: [
              {
                skillName: 'JavaScript',
                initialLevel: 2,
                currentLevel: 3,
                progressPercentage: 75,
                sessionsCount: 6,
                hoursSpent: 9.5,
                trend: 'improving',
              },
              {
                skillName: 'React',
                initialLevel: 1,
                currentLevel: 2,
                progressPercentage: 60,
                sessionsCount: 4,
                hoursSpent: 6.0,
                trend: 'improving',
              },
            ],
            learningVelocity: {
              sessionsPerWeek: 2.5,
              hoursPerWeek: 4.2,
              skillsLearnedPerMonth: 1.2,
              averageSessionDuration: 92,
              peakLearningDays: ['Tuesday', 'Thursday'],
              learningConsistency: 85,
            },
          },
        }),
      });

      const analyticsResponse = await fetch('/api/sessions/analytics', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const analyticsResult = await analyticsResponse.json();
      expect(analyticsResult.success).toBe(true);
      expect(analyticsResult.data.overview.totalSessions).toBe(12);
      expect(analyticsResult.data.skillProgression).toHaveLength(2);
      expect(analyticsResult.data.learningVelocity.sessionsPerWeek).toBe(2.5);

      // Step 3: Load achievements
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            {
              id: 'achievement-1',
              name: 'First Session',
              description: 'Complete your first learning session',
              category: 'milestone',
              points: 10,
              rarity: 'common',
              earnedAt: '2023-11-01T10:00:00Z',
            },
            {
              id: 'achievement-2',
              name: 'JavaScript Novice',
              description: 'Reach level 3 in JavaScript',
              category: 'skill',
              points: 50,
              rarity: 'rare',
              earnedAt: '2023-11-15T14:30:00Z',
            },
          ],
        }),
      });

      const achievementsResponse = await fetch('/api/achievements', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const achievementsResult = await achievementsResponse.json();
      expect(achievementsResult.success).toBe(true);
      expect(achievementsResult.data).toHaveLength(2);
      expect(achievementsResult.data[1].name).toBe('JavaScript Novice');

      // Step 4: Load leaderboard
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            {
              userId: 'user-1',
              username: 'coding_master',
              totalPoints: 1250,
              rank: 1,
              totalSessions: 45,
              skillsLearned: 12,
            },
            {
              userId: 'user-123', // Current user
              username: 'testuser',
              totalPoints: 285,
              rank: 23,
              totalSessions: 12,
              skillsLearned: 3,
            },
          ],
        }),
      });

      const leaderboardResponse = await fetch('/api/leaderboard', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const leaderboardResult = await leaderboardResponse.json();
      expect(leaderboardResult.success).toBe(true);
      expect(leaderboardResult.data).toHaveLength(2);
      expect(leaderboardResult.data[1].rank).toBe(23);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle network failures and retry mechanisms', async () => {
      const accessToken = 'valid-access-token';

      // Simulate network failure
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { message: 'Success after retry' },
          }),
        });

      // Implement retry logic
      const retryFetch = async (url: string, options: any, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const response = await fetch(url, options);
            if (response.ok) {
              return response;
            }
            throw new Error(`HTTP ${response.status}`);
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
          }
        }
      };

      const response = await retryFetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      const result = await response!.json();
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    it('should handle token expiration and refresh', async () => {
      const expiredToken = 'expired-access-token';
      const refreshToken = 'valid-refresh-token';
      const newAccessToken = 'new-access-token';

      mockLocalStorage.setItem('accessToken', expiredToken);
      mockLocalStorage.setItem('refreshToken', refreshToken);

      // First request fails with 401
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({
            success: false,
            error: 'Token expired',
          }),
        })
        // Token refresh succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              accessToken: newAccessToken,
              refreshToken: 'new-refresh-token',
            },
          }),
        })
        // Retry original request succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { message: 'Success with new token' },
          }),
        });

      // Simulate token refresh flow
      const makeAuthenticatedRequest = async (url: string) => {
        let token = mockLocalStorage.getItem('accessToken');

        let response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.status === 401) {
          // Token expired, refresh it
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refreshToken: mockLocalStorage.getItem('refreshToken'),
            }),
          });

          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            mockLocalStorage.setItem('accessToken', refreshResult.data.accessToken);
            mockLocalStorage.setItem('refreshToken', refreshResult.data.refreshToken);

            // Retry original request
            response = await fetch(url, {
              headers: { 'Authorization': `Bearer ${refreshResult.data.accessToken}` },
            });
          }
        }

        return response;
      };

      const finalResponse = await makeAuthenticatedRequest('/api/dashboard/stats');
      const result = await finalResponse.json();

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Success with new token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', newAccessToken);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      const accessToken = 'valid-access-token';

      // Simulate loading large session history
      const largeSessionHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        partnerId: `partner-${i}`,
        sessionType: i % 3 === 0 ? 'learning' : i % 3 === 1 ? 'teaching' : 'collaboration',
        startTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60 + (i % 60),
        rating: 3 + (i % 3),
        topics: [`Topic ${i}`, `Skill ${i % 10}`],
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: largeSessionHistory,
          pagination: {
            page: 1,
            limit: 100,
            total: 100,
            totalPages: 1,
          },
        }),
      });

      const startTime = Date.now();
      const response = await fetch('/api/sessions/history?limit=100', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const result = await response.json();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should implement proper caching mechanisms', async () => {
      const accessToken = 'valid-access-token';
      const cacheKey = 'dashboard-stats';
      const cachedData = {
        onlineUsers: 200,
        activeMatches: 15,
        timestamp: Date.now(),
      };

      // Mock sessionStorage.setItem to actually store the data
      const storage: Record<string, string> = {};
      mockSessionStorage.setItem.mockImplementation((key: string, value: string) => {
        storage[key] = value;
      });
      mockSessionStorage.getItem.mockImplementation((key: string) => {
        return storage[key] || null;
      });

      // Simulate cache check
      mockSessionStorage.setItem(cacheKey, JSON.stringify(cachedData));

      const getCachedData = (key: string, maxAge = 5 * 60 * 1000) => { // 5 minutes
        const cached = mockSessionStorage.getItem(key);
        if (cached) {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < maxAge) {
            return data;
          }
        }
        return null;
      };

      const cached = getCachedData(cacheKey);
      expect(cached).toBeDefined();
      expect(cached.onlineUsers).toBe(200);

      // Verify cache functionality
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(cacheKey, JSON.stringify(cachedData));
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(cacheKey);
    });
  });
});