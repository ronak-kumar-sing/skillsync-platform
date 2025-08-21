import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MatchingService } from '../matching.service';
import { UserProfile, UserSkill, AvailabilitySchedule } from '../../types';

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    matchingQueue: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    userStats: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock MatchingAnalytics
vi.mock('../../lib/matching-analytics', () => ({
  MatchingAnalytics: {
    recordMatchingAttempt: vi.fn(),
  },
}));

describe('MatchingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Skill Compatibility Calculation', () => {
    const createSkill = (name: string, level: number): UserSkill => ({
      id: `skill-${name}`,
      skillId: `skill-id-${name}`,
      skill: {
        id: `skill-id-${name}`,
        name,
        category: 'Programming',
        description: `${name} skill`,
        createdAt: new Date(),
      },
      proficiencyLevel: level as 1 | 2 | 3 | 4 | 5,
      verified: false,
      endorsements: 0,
      createdAt: new Date(),
    });

    it('should calculate perfect skill compatibility for learning session', () => {
      const requesterSkills = [createSkill('JavaScript', 2)];
      const candidateSkills = [createSkill('JavaScript', 4)];
      const preferredSkills = ['JavaScript'];

      // Access private method for testing
      const score = (MatchingService as any).calculateSkillCompatibility(
        requesterSkills,
        candidateSkills,
        preferredSkills,
        'learning'
      );

      expect(score).toBeGreaterThan(0.9); // Should be high for ideal learning gap
    });

    it('should calculate lower compatibility for same skill levels in learning', () => {
      const requesterSkills = [createSkill('JavaScript', 3)];
      const candidateSkills = [createSkill('JavaScript', 3)];
      const preferredSkills = ['JavaScript'];

      const score = (MatchingService as any).calculateSkillCompatibility(
        requesterSkills,
        candidateSkills,
        preferredSkills,
        'learning'
      );

      expect(score).toBeLessThan(0.9); // Should be lower for peer learning
    });

    it('should calculate high compatibility for collaboration with similar levels', () => {
      const requesterSkills = [createSkill('React', 3)];
      const candidateSkills = [createSkill('React', 3)];
      const preferredSkills = ['React'];

      const score = (MatchingService as any).calculateSkillCompatibility(
        requesterSkills,
        candidateSkills,
        preferredSkills,
        'collaboration'
      );

      expect(score).toBeGreaterThan(0.9); // Same level is perfect for collaboration
    });

    it('should return low score for no matching skills', () => {
      const requesterSkills = [createSkill('JavaScript', 3)];
      const candidateSkills = [createSkill('Python', 3)];
      const preferredSkills = ['JavaScript'];

      const score = (MatchingService as any).calculateSkillCompatibility(
        requesterSkills,
        candidateSkills,
        preferredSkills,
        'learning'
      );

      expect(score).toBeLessThan(0.2); // Should be very low for no matches
    });

    it('should give higher weight to preferred skills', () => {
      const requesterSkills = [
        createSkill('JavaScript', 2),
        createSkill('Python', 2)
      ];
      const candidateSkills = [
        createSkill('JavaScript', 4),
        createSkill('Python', 2)
      ];
      const preferredSkills = ['JavaScript'];

      const score = (MatchingService as any).calculateSkillCompatibility(
        requesterSkills,
        candidateSkills,
        preferredSkills,
        'learning'
      );

      // Should be higher than if JavaScript wasn't preferred
      const scoreWithoutPreference = (MatchingService as any).calculateSkillCompatibility(
        requesterSkills,
        candidateSkills,
        [],
        'learning'
      );

      expect(score).toBeGreaterThan(scoreWithoutPreference);
    });
  });

  describe('Timezone Compatibility Calculation', () => {
    it('should return perfect score for same timezone', () => {
      const score = (MatchingService as any).calculateTimezoneCompatibility(
        'America/New_York',
        'America/New_York'
      );

      expect(score).toBe(1.0);
    });

    it('should return high score for close timezones', () => {
      const score = (MatchingService as any).calculateTimezoneCompatibility(
        'America/New_York',
        'America/Toronto'
      );

      expect(score).toBeGreaterThan(0.8);
    });

    it('should return low score for very different timezones', () => {
      const score = (MatchingService as any).calculateTimezoneCompatibility(
        'America/New_York',
        'Asia/Tokyo'
      );

      expect(score).toBeLessThan(0.3);
    });

    it('should handle invalid timezones gracefully', () => {
      const score = (MatchingService as any).calculateTimezoneCompatibility(
        'Invalid/Timezone',
        'America/New_York'
      );

      expect(score).toBe(0.5); // Default fallback score
    });
  });

  describe('Availability Compatibility Calculation', () => {
    const createSchedule = (mondaySlots: Array<{start: string, end: string}>): AvailabilitySchedule => ({
      monday: mondaySlots,
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    });

    it('should return high score for overlapping availability', () => {
      const schedule1 = createSchedule([{ start: '09:00', end: '17:00' }]);
      const schedule2 = createSchedule([{ start: '10:00', end: '18:00' }]);

      const score = (MatchingService as any).calculateAvailabilityCompatibility(
        schedule1,
        schedule2
      );

      expect(score).toBeGreaterThan(0.5);
    });

    it('should return low score for no overlapping availability', () => {
      const schedule1 = createSchedule([{ start: '09:00', end: '12:00' }]);
      const schedule2 = createSchedule([{ start: '14:00', end: '17:00' }]);

      const score = (MatchingService as any).calculateAvailabilityCompatibility(
        schedule1,
        schedule2
      );

      expect(score).toBeLessThan(0.2);
    });

    it('should handle missing schedules gracefully', () => {
      const schedule1 = createSchedule([{ start: '09:00', end: '17:00' }]);

      const score = (MatchingService as any).calculateAvailabilityCompatibility(
        schedule1,
        null
      );

      expect(score).toBe(0.5); // Default score
    });
  });

  describe('Time Slot Overlap Calculation', () => {
    it('should calculate correct overlap for overlapping slots', () => {
      const slot1 = { start: '09:00', end: '12:00' };
      const slot2 = { start: '10:00', end: '14:00' };

      const overlap = (MatchingService as any).getTimeSlotOverlapMinutes(slot1, slot2);

      expect(overlap).toBe(120); // 2 hours = 120 minutes
    });

    it('should return zero for non-overlapping slots', () => {
      const slot1 = { start: '09:00', end: '12:00' };
      const slot2 = { start: '14:00', end: '17:00' };

      const overlap = (MatchingService as any).getTimeSlotOverlapMinutes(slot1, slot2);

      expect(overlap).toBe(0);
    });

    it('should handle adjacent slots correctly', () => {
      const slot1 = { start: '09:00', end: '12:00' };
      const slot2 = { start: '12:00', end: '15:00' };

      const overlap = (MatchingService as any).getTimeSlotOverlapMinutes(slot1, slot2);

      expect(overlap).toBe(0); // Adjacent but not overlapping
    });
  });

  describe('Communication Compatibility Calculation', () => {
    const createPreferences = (
      communicationStyle: 'formal' | 'casual' | 'balanced',
      languages: string[] = ['en'],
      maxDuration: number = 60
    ) => ({
      id: 'pref-1',
      preferredSessionTypes: ['learning'] as const,
      maxSessionDuration: maxDuration,
      communicationStyle,
      availabilitySchedule: {} as AvailabilitySchedule,
      languagePreferences: languages,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('should return high score for matching communication styles', () => {
      const prefs1 = createPreferences('formal');
      const prefs2 = createPreferences('formal');

      const score = (MatchingService as any).calculateCommunicationCompatibility(
        prefs1,
        prefs2
      );

      expect(score).toBeGreaterThan(0.8);
    });

    it('should return good score when one user prefers balanced style', () => {
      const prefs1 = createPreferences('formal');
      const prefs2 = createPreferences('balanced');

      const score = (MatchingService as any).calculateCommunicationCompatibility(
        prefs1,
        prefs2
      );

      expect(score).toBeGreaterThan(0.7);
    });

    it('should return high score for common languages', () => {
      const prefs1 = createPreferences('casual', ['en', 'es']);
      const prefs2 = createPreferences('casual', ['en', 'fr']);

      const score = (MatchingService as any).calculateCommunicationCompatibility(
        prefs1,
        prefs2
      );

      expect(score).toBeGreaterThan(0.8); // Common language (en)
    });

    it('should return lower score for very different session durations', () => {
      const prefs1 = createPreferences('casual', ['en'], 30);
      const prefs2 = createPreferences('casual', ['en'], 120);

      const score = (MatchingService as any).calculateCommunicationCompatibility(
        prefs1,
        prefs2
      );

      expect(score).toBeLessThan(0.8); // Large duration difference
    });

    it('should handle missing preferences gracefully', () => {
      const prefs1 = createPreferences('casual');

      const score = (MatchingService as any).calculateCommunicationCompatibility(
        prefs1,
        null
      );

      expect(score).toBe(0.5); // Default score
    });
  });

  describe('Time Conversion Utilities', () => {
    it('should convert time string to minutes correctly', () => {
      expect((MatchingService as any).timeToMinutes('09:00')).toBe(540);
      expect((MatchingService as any).timeToMinutes('12:30')).toBe(750);
      expect((MatchingService as any).timeToMinutes('00:00')).toBe(0);
      expect((MatchingService as any).timeToMinutes('23:59')).toBe(1439);
    });

    it('should calculate total slot duration correctly', () => {
      const slots = [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '16:00' }
      ];

      const duration = (MatchingService as any).getTotalSlotDuration(slots);

      expect(duration).toBe(300); // 3 hours + 2 hours = 5 hours = 300 minutes
    });
  });

  describe('Queue Management', () => {
    it('should calculate correct expiration time for different urgencies', () => {
      expect((MatchingService as any).getQueueExpirationMinutes('high')).toBe(15);
      expect((MatchingService as any).getQueueExpirationMinutes('medium')).toBe(30);
      expect((MatchingService as any).getQueueExpirationMinutes('low')).toBe(60);
      expect((MatchingService as any).getQueueExpirationMinutes('invalid')).toBe(30);
    });

    it('should determine compatible session types correctly', () => {
      expect((MatchingService as any).getCompatibleSessionTypes('learning'))
        .toEqual(['teaching', 'collaboration']);
      expect((MatchingService as any).getCompatibleSessionTypes('teaching'))
        .toEqual(['learning', 'collaboration']);
      expect((MatchingService as any).getCompatibleSessionTypes('collaboration'))
        .toEqual(['collaboration', 'learning', 'teaching']);
    });
  });

  describe('Skill Complementarity Edge Cases', () => {
    it('should handle extreme skill level differences', () => {
      // Test very large skill gaps
      const score1 = (MatchingService as any).calculateSkillComplementarity(1, 5, 'learning');
      const score2 = (MatchingService as any).calculateSkillComplementarity(5, 1, 'teaching');

      expect(score1).toBeLessThan(0.6); // Large gap should reduce score
      expect(score2).toBeLessThan(0.6);
    });

    it('should handle invalid session types', () => {
      const score = (MatchingService as any).calculateSkillComplementarity(3, 3, 'invalid');
      expect(score).toBe(0.5); // Default fallback
    });
  });
});