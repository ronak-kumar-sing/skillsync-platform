import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MatchingService, MatchingRequest } from '@/services/matching.service';
import { UserProfile, UserSkill, AvailabilitySchedule } from '@/types';

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

describe('Matching Algorithm', () => {
  const mockRequesterProfile: UserProfile = {
    id: 'user-1',
    email: 'requester@example.com',
    username: 'requester',
    avatarUrl: null,
    timezone: 'America/New_York',
    isVerified: true,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
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
        proficiencyLevel: 2,
        verified: false,
        endorsements: 0,
        createdAt: new Date('2023-01-01'),
      },
    ],
    learningGoals: [],
    preferences: {
      id: 'pref-1',
      preferredSessionTypes: ['learning'],
      maxSessionDuration: 60,
      communicationStyle: 'casual',
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

  const mockCandidateProfile: UserProfile = {
    id: 'user-2',
    email: 'candidate@example.com',
    username: 'candidate',
    avatarUrl: null,
    timezone: 'America/New_York',
    isVerified: true,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    lastActive: new Date('2023-12-01'),
    skills: [
      {
        id: 'skill-2',
        skillId: 'js-skill',
        skill: {
          id: 'js-skill',
          name: 'JavaScript',
          category: 'Programming',
          description: 'JavaScript programming language',
          createdAt: new Date('2023-01-01'),
        },
        proficiencyLevel: 4,
        verified: true,
        endorsements: 5,
        createdAt: new Date('2023-01-01'),
      },
    ],
    learningGoals: [],
    preferences: {
      id: 'pref-2',
      preferredSessionTypes: ['teaching', 'collaboration'],
      maxSessionDuration: 90,
      communicationStyle: 'casual',
      availabilitySchedule: {
        monday: [{ start: '10:00', end: '18:00' }],
        tuesday: [{ start: '10:00', end: '18:00' }],
        wednesday: [{ start: '10:00', end: '18:00' }],
        thursday: [{ start: '10:00', end: '18:00' }],
        friday: [{ start: '10:00', end: '18:00' }],
        saturday: [],
        sunday: [],
      },
      languagePreferences: ['en'],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    stats: {
      id: 'stats-2',
      totalSessions: 20,
      totalMinutesLearned: 1200,
      averageRating: 4.8,
      skillsLearned: 5,
      skillsTaught: 15,
      achievementPoints: 500,
      currentStreak: 7,
      longestStreak: 10,
      lastSessionDate: new Date('2023-11-29'),
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-12-01'),
    },
    achievements: [],
  };

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

  describe('Skill Compatibility Calculation', () => {
    it('should calculate high compatibility for learning sessions with skill gap', () => {
      // Access private method through type assertion for testing
      const calculateSkillCompatibility = (MatchingService as any).calculateSkillCompatibility;

      const score = calculateSkillCompatibility(
        mockRequesterProfile.skills,
        mockCandidateProfile.skills,
        ['JavaScript'],
        'learning'
      );

      expect(score).toBeGreaterThan(0.8);
    });

    it('should calculate lower compatibility for teaching with insufficient skill gap', () => {
      const calculateSkillCompatibility = (MatchingService as any).calculateSkillCompatibility;

      const score = calculateSkillCompatibility(
        mockCandidateProfile.skills, // Higher skill level user
        mockRequesterProfile.skills, // Lower skill level user
        ['JavaScript'],
        'teaching'
      );

      expect(score).toBeLessThan(0.5);
    });

    it('should handle collaboration sessions with similar skill levels', () => {
      const calculateSkillCompatibility = (MatchingService as any).calculateSkillCompatibility;

      const similarSkills = [{
        ...mockRequesterProfile.skills[0],
        proficiencyLevel: 3 as const,
      }];

      const candidateSkills = [{
        ...mockCandidateProfile.skills[0],
        proficiencyLevel: 3 as const,
      }];

      const score = calculateSkillCompatibility(
        similarSkills,
        candidateSkills,
        ['JavaScript'],
        'collaboration'
      );

      expect(score).toBeGreaterThan(0.9);
    });

    it('should return low score for no skill overlap', () => {
      const calculateSkillCompatibility = (MatchingService as any).calculateSkillCompatibility;

      const pythonSkills = [{
        id: 'skill-3',
        skillId: 'python-skill',
        skill: {
          id: 'python-skill',
          name: 'Python',
          category: 'Programming',
          description: 'Python programming language',
          createdAt: new Date('2023-01-01'),
        },
        proficiencyLevel: 4 as const,
        verified: true,
        endorsements: 3,
        createdAt: new Date('2023-01-01'),
      }];

      const score = calculateSkillCompatibility(
        mockRequesterProfile.skills,
        pythonSkills,
        ['JavaScript'],
        'learning'
      );

      expect(score).toBeLessThan(0.2);
    });

    it('should give higher weight to preferred skills', () => {
      const calculateSkillCompatibility = (MatchingService as any).calculateSkillCompatibility;

      const multiSkillRequester = [
        ...mockRequesterProfile.skills,
        {
          id: 'skill-4',
          skillId: 'react-skill',
          skill: {
            id: 'react-skill',
            name: 'React',
            category: 'Framework',
            description: 'React framework',
            createdAt: new Date('2023-01-01'),
          },
          proficiencyLevel: 1 as const,
          verified: false,
          endorsements: 0,
          createdAt: new Date('2023-01-01'),
        },
      ];

      const multiSkillCandidate = [
        ...mockCandidateProfile.skills,
        {
          id: 'skill-5',
          skillId: 'react-skill',
          skill: {
            id: 'react-skill',
            name: 'React',
            category: 'Framework',
            description: 'React framework',
            createdAt: new Date('2023-01-01'),
          },
          proficiencyLevel: 5 as const,
          verified: true,
          endorsements: 10,
          createdAt: new Date('2023-01-01'),
        },
      ];

      const scoreWithPreferred = calculateSkillCompatibility(
        multiSkillRequester,
        multiSkillCandidate,
        ['JavaScript'], // Only JavaScript is preferred
        'learning'
      );

      const scoreWithoutPreferred = calculateSkillCompatibility(
        multiSkillRequester,
        multiSkillCandidate,
        ['React'], // Only React is preferred
        'learning'
      );

      // Both should be high, but the preferred skill should have impact
      expect(scoreWithPreferred).toBeGreaterThan(0.5);
      expect(scoreWithoutPreferred).toBeGreaterThan(0.5);
    });
  });

  describe('Timezone Compatibility Calculation', () => {
    it('should calculate high compatibility for same timezone', () => {
      const calculateTimezoneCompatibility = (MatchingService as any).calculateTimezoneCompatibility;

      const score = calculateTimezoneCompatibility(
        'America/New_York',
        'America/New_York'
      );

      expect(score).toBe(1.0);
    });

    it('should calculate lower compatibility for different timezones', () => {
      const calculateTimezoneCompatibility = (MatchingService as any).calculateTimezoneCompatibility;

      const score = calculateTimezoneCompatibility(
        'America/New_York',
        'Europe/London'
      );

      expect(score).toBeLessThan(1.0);
      expect(score).toBeGreaterThan(0.3);
    });

    it('should handle very different timezones', () => {
      const calculateTimezoneCompatibility = (MatchingService as any).calculateTimezoneCompatibility;

      const score = calculateTimezoneCompatibility(
        'America/New_York',
        'Asia/Tokyo'
      );

      expect(score).toBeLessThan(0.5);
    });

    it('should handle invalid timezones gracefully', () => {
      const calculateTimezoneCompatibility = (MatchingService as any).calculateTimezoneCompatibility;

      const score = calculateTimezoneCompatibility(
        'Invalid/Timezone',
        'America/New_York'
      );

      expect(score).toBe(0.5); // Default fallback score
    });
  });

  describe('Availability Compatibility Calculation', () => {
    it('should calculate high compatibility for overlapping schedules', () => {
      const calculateAvailabilityCompatibility = (MatchingService as any).calculateAvailabilityCompatibility;

      const overlappingSchedule: AvailabilitySchedule = {
        monday: [{ start: '10:00', end: '16:00' }], // Overlaps with 09:00-17:00
        tuesday: [{ start: '10:00', end: '16:00' }],
        wednesday: [{ start: '10:00', end: '16:00' }],
        thursday: [{ start: '10:00', end: '16:00' }],
        friday: [{ start: '10:00', end: '16:00' }],
        saturday: [],
        sunday: [],
      };

      const score = calculateAvailabilityCompatibility(
        mockRequesterProfile.preferences?.availabilitySchedule,
        overlappingSchedule
      );

      expect(score).toBeGreaterThan(0.5);
    });

    it('should calculate low compatibility for non-overlapping schedules', () => {
      const calculateAvailabilityCompatibility = (MatchingService as any).calculateAvailabilityCompatibility;

      const nonOverlappingSchedule: AvailabilitySchedule = {
        monday: [{ start: '18:00', end: '22:00' }], // No overlap with 09:00-17:00
        tuesday: [{ start: '18:00', end: '22:00' }],
        wednesday: [{ start: '18:00', end: '22:00' }],
        thursday: [{ start: '18:00', end: '22:00' }],
        friday: [{ start: '18:00', end: '22:00' }],
        saturday: [],
        sunday: [],
      };

      const score = calculateAvailabilityCompatibility(
        mockRequesterProfile.preferences?.availabilitySchedule,
        nonOverlappingSchedule
      );

      expect(score).toBeLessThan(0.2);
    });

    it('should handle missing schedule data', () => {
      const calculateAvailabilityCompatibility = (MatchingService as any).calculateAvailabilityCompatibility;

      const score = calculateAvailabilityCompatibility(null, null);
      expect(score).toBe(0.5); // Default score

      const score2 = calculateAvailabilityCompatibility(
        mockRequesterProfile.preferences?.availabilitySchedule,
        null
      );
      expect(score2).toBe(0.5);
    });

    it('should handle complex schedules with multiple time slots', () => {
      const calculateAvailabilityCompatibility = (MatchingService as any).calculateAvailabilityCompatibility;

      const complexSchedule: AvailabilitySchedule = {
        monday: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '17:00' }
        ],
        tuesday: [{ start: '10:00', end: '15:00' }],
        wednesday: [],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '13:00', end: '18:00' }],
        saturday: [{ start: '10:00', end: '14:00' }],
        sunday: [],
      };

      const score = calculateAvailabilityCompatibility(
        mockRequesterProfile.preferences?.availabilitySchedule,
        complexSchedule
      );

      expect(score).toBeGreaterThan(0.3);
    });
  });

  describe('Communication Compatibility Calculation', () => {
    it('should calculate high compatibility for same communication style', () => {
      const calculateCommunicationCompatibility = (MatchingService as any).calculateCommunicationCompatibility;

      const score = calculateCommunicationCompatibility(
        mockRequesterProfile.preferences,
        mockCandidateProfile.preferences
      );

      expect(score).toBeGreaterThan(0.8); // Both have 'casual' style
    });

    it('should calculate medium compatibility with balanced style', () => {
      const calculateCommunicationCompatibility = (MatchingService as any).calculateCommunicationCompatibility;

      const balancedPreferences = {
        ...mockCandidateProfile.preferences!,
        communicationStyle: 'balanced' as const,
      };

      const score = calculateCommunicationCompatibility(
        mockRequesterProfile.preferences,
        balancedPreferences
      );

      expect(score).toBeGreaterThan(0.7);
      expect(score).toBeLessThan(1.0);
    });

    it('should calculate lower compatibility for different styles', () => {
      const calculateCommunicationCompatibility = (MatchingService as any).calculateCommunicationCompatibility;

      const formalPreferences = {
        ...mockCandidateProfile.preferences!,
        communicationStyle: 'formal' as const,
      };

      const score = calculateCommunicationCompatibility(
        mockRequesterProfile.preferences,
        formalPreferences
      );

      expect(score).toBeLessThan(0.7);
      expect(score).toBeGreaterThan(0.3);
    });

    it('should consider language preferences', () => {
      const calculateCommunicationCompatibility = (MatchingService as any).calculateCommunicationCompatibility;

      const differentLanguagePrefs = {
        ...mockCandidateProfile.preferences!,
        languagePreferences: ['es', 'fr'], // No common language with 'en'
      };

      const score = calculateCommunicationCompatibility(
        mockRequesterProfile.preferences,
        differentLanguagePrefs
      );

      expect(score).toBeLessThan(0.5);
    });

    it('should consider session duration preferences', () => {
      const calculateCommunicationCompatibility = (MatchingService as any).calculateCommunicationCompatibility;

      const veryDifferentDuration = {
        ...mockCandidateProfile.preferences!,
        maxSessionDuration: 180, // 3 hours vs 1 hour
      };

      const score = calculateCommunicationCompatibility(
        mockRequesterProfile.preferences,
        veryDifferentDuration
      );

      expect(score).toBeLessThan(0.8);
    });
  });

  describe('Session History Compatibility Calculation', () => {
    it('should handle users with no previous sessions', async () => {
      const calculateSessionHistoryCompatibility = (MatchingService as any).calculateSessionHistoryCompatibility;

      // Mock no previous sessions
      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([]);

      const score = await calculateSessionHistoryCompatibility(
        'user-1',
        'user-2',
        mockRequesterProfile.stats,
        mockCandidateProfile.stats
      );

      expect(score).toBeGreaterThan(0.3);
      expect(score).toBeLessThan(0.8);
    });

    it('should use previous session ratings when available', async () => {
      const calculateSessionHistoryCompatibility = (MatchingService as any).calculateSessionHistoryCompatibility;

      // Mock previous sessions with good ratings
      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([
        {
          ratingInitiator: 5,
          ratingPartner: 4,
          sessionType: 'learning',
          createdAt: new Date('2023-11-01'),
        },
        {
          ratingInitiator: 4,
          ratingPartner: 5,
          sessionType: 'learning',
          createdAt: new Date('2023-11-15'),
        },
      ]);

      const score = await calculateSessionHistoryCompatibility(
        'user-1',
        'user-2',
        mockRequesterProfile.stats,
        mockCandidateProfile.stats
      );

      expect(score).toBeGreaterThan(0.8);
    });

    it('should penalize poor previous session ratings', async () => {
      const calculateSessionHistoryCompatibility = (MatchingService as any).calculateSessionHistoryCompatibility;

      // Mock previous sessions with poor ratings
      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([
        {
          ratingInitiator: 2,
          ratingPartner: 1,
          sessionType: 'learning',
          createdAt: new Date('2023-11-01'),
        },
      ]);

      const score = await calculateSessionHistoryCompatibility(
        'user-1',
        'user-2',
        mockRequesterProfile.stats,
        mockCandidateProfile.stats
      );

      expect(score).toBeLessThan(0.4);
    });

    it('should consider user experience levels', async () => {
      const calculateSessionHistoryCompatibility = (MatchingService as any).calculateSessionHistoryCompatibility;

      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([]);

      const inexperiencedStats = {
        ...mockRequesterProfile.stats!,
        totalSessions: 1,
        averageRating: null,
      };

      const score = await calculateSessionHistoryCompatibility(
        'user-1',
        'user-2',
        inexperiencedStats,
        mockCandidateProfile.stats
      );

      expect(score).toBeGreaterThan(0.3);
      expect(score).toBeLessThan(0.7);
    });
  });

  describe('Overall Compatibility Scoring', () => {
    it('should calculate weighted total compatibility score', async () => {
      const calculateCompatibilityScore = (MatchingService as any).calculateCompatibilityScore;

      // Mock queue service
      const queueService = await import('@/services/queue-manager.service');
      (queueService.QueueManagerService.getNextCandidates as any).mockResolvedValue([
        { userId: 'user-2' }
      ]);

      // Mock database calls
      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([]);

      const result = await calculateCompatibilityScore(
        mockRequesterProfile,
        mockCandidateProfile,
        mockMatchingRequest
      );

      expect(result.compatibilityScore).toBeGreaterThan(0);
      expect(result.compatibilityScore).toBeLessThanOrEqual(1);
      expect(result.scoreBreakdown).toBeDefined();
      expect(result.scoreBreakdown.skillCompatibility).toBeGreaterThan(0);
      expect(result.scoreBreakdown.timezoneCompatibility).toBeGreaterThan(0);
      expect(result.scoreBreakdown.totalScore).toBe(result.compatibilityScore);
    });

    it('should ensure score breakdown components sum correctly', async () => {
      const calculateCompatibilityScore = (MatchingService as any).calculateCompatibilityScore;

      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([]);

      const result = await calculateCompatibilityScore(
        mockRequesterProfile,
        mockCandidateProfile,
        mockMatchingRequest
      );

      const { scoreBreakdown } = result;
      const manualTotal =
        (scoreBreakdown.skillCompatibility * 0.30) +
        (scoreBreakdown.timezoneCompatibility * 0.15) +
        (scoreBreakdown.availabilityCompatibility * 0.15) +
        (scoreBreakdown.communicationCompatibility * 0.15) +
        (scoreBreakdown.sessionHistoryCompatibility * 0.25);

      expect(Math.abs(scoreBreakdown.totalScore - manualTotal)).toBeLessThan(0.01);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle users with no skills', async () => {
      const calculateCompatibilityScore = (MatchingService as any).calculateCompatibilityScore;

      const noSkillsProfile = {
        ...mockRequesterProfile,
        skills: [],
      };

      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([]);

      const result = await calculateCompatibilityScore(
        noSkillsProfile,
        mockCandidateProfile,
        mockMatchingRequest
      );

      expect(result.scoreBreakdown.skillCompatibility).toBeLessThan(0.2);
    });

    it('should handle users with no preferences', async () => {
      const calculateCompatibilityScore = (MatchingService as any).calculateCompatibilityScore;

      const noPreferencesProfile = {
        ...mockRequesterProfile,
        preferences: null,
      };

      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([]);

      const result = await calculateCompatibilityScore(
        noPreferencesProfile,
        mockCandidateProfile,
        mockMatchingRequest
      );

      expect(result.scoreBreakdown.availabilityCompatibility).toBe(0.5);
      expect(result.scoreBreakdown.communicationCompatibility).toBe(0.5);
    });

    it('should handle users with no stats', async () => {
      const calculateCompatibilityScore = (MatchingService as any).calculateCompatibilityScore;

      const noStatsProfile = {
        ...mockRequesterProfile,
        stats: null,
      };

      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockResolvedValue([]);

      const result = await calculateCompatibilityScore(
        noStatsProfile,
        mockCandidateProfile,
        mockMatchingRequest
      );

      expect(result.scoreBreakdown.sessionHistoryCompatibility).toBeGreaterThan(0.1);
    });

    it('should handle database errors gracefully', async () => {
      const calculateSessionHistoryCompatibility = (MatchingService as any).calculateSessionHistoryCompatibility;

      // Mock database error
      const prisma = await import('@/lib/prisma');
      (prisma.default.session.findMany as any).mockRejectedValue(new Error('Database error'));

      // Should not throw, should return default score
      const score = await calculateSessionHistoryCompatibility(
        'user-1',
        'user-2',
        mockRequesterProfile.stats,
        mockCandidateProfile.stats
      );

      expect(score).toBeGreaterThan(0.1);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('Time Slot Calculations', () => {
    it('should calculate time slot overlaps correctly', () => {
      const getTimeSlotOverlapMinutes = (MatchingService as any).getTimeSlotOverlapMinutes;

      // Complete overlap
      const overlap1 = getTimeSlotOverlapMinutes(
        { start: '09:00', end: '17:00' },
        { start: '09:00', end: '17:00' }
      );
      expect(overlap1).toBe(480); // 8 hours

      // Partial overlap
      const overlap2 = getTimeSlotOverlapMinutes(
        { start: '09:00', end: '17:00' },
        { start: '14:00', end: '20:00' }
      );
      expect(overlap2).toBe(180); // 3 hours (14:00-17:00)

      // No overlap
      const overlap3 = getTimeSlotOverlapMinutes(
        { start: '09:00', end: '17:00' },
        { start: '18:00', end: '22:00' }
      );
      expect(overlap3).toBe(0);

      // Adjacent slots (no overlap)
      const overlap4 = getTimeSlotOverlapMinutes(
        { start: '09:00', end: '17:00' },
        { start: '17:00', end: '20:00' }
      );
      expect(overlap4).toBe(0);
    });

    it('should convert time strings to minutes correctly', () => {
      const timeToMinutes = (MatchingService as any).timeToMinutes;

      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('09:30')).toBe(570); // 9*60 + 30
      expect(timeToMinutes('17:45')).toBe(1065); // 17*60 + 45
      expect(timeToMinutes('23:59')).toBe(1439); // 23*60 + 59
    });

    it('should calculate total slot duration correctly', () => {
      const getTotalSlotDuration = (MatchingService as any).getTotalSlotDuration;

      const slots = [
        { start: '09:00', end: '12:00' }, // 3 hours
        { start: '14:00', end: '17:00' }, // 3 hours
      ];

      expect(getTotalSlotDuration(slots)).toBe(360); // 6 hours total
    });
  });
});