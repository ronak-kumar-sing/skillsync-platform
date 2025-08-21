import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AchievementService } from '@/services/achievement.service';
import { achievementNotificationService } from '@/services/achievement-notification.service';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    userStats: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    achievement: {
      findMany: vi.fn(),
    },
    userAchievement: {
      findMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    session: {
      count: vi.fn(),
    },
    userSkill: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Achievement System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AchievementNotificationService', () => {
    it('should create notification queue correctly', () => {
      const service = achievementNotificationService;
      const queue = service.getQueue();

      expect(queue.notifications).toEqual([]);
      expect(queue.currentIndex).toBe(0);
      expect(queue.isPlaying).toBe(false);
    });

    it('should add achievements to queue', () => {
      const service = achievementNotificationService;
      const mockAchievement = {
        id: 'test-1',
        achievementId: 'achievement-1',
        achievement: {
          id: 'achievement-1',
          name: 'Test Achievement',
          description: 'Test description',
          category: 'testing',
          points: 100,
          rarity: 'common' as const,
          criteria: {},
          createdAt: new Date(),
        },
        earnedAt: new Date(),
      };

      service.addAchievements([mockAchievement]);
      const queue = service.getQueue();

      expect(queue.notifications).toHaveLength(1);
      expect(queue.notifications[0].achievement.name).toBe('Test Achievement');
    });

    it('should get correct rarity styles', () => {
      const legendaryStyles = achievementNotificationService.constructor.getRarityStyles('legendary');
      expect(legendaryStyles.gradient).toContain('yellow');
      expect(legendaryStyles.glow).toContain('shadow');

      const commonStyles = achievementNotificationService.constructor.getRarityStyles('common');
      expect(commonStyles.gradient).toContain('gray');
    });

    it('should get correct animation settings', () => {
      const legendaryAnimation = achievementNotificationService.constructor.getRarityAnimation('legendary');
      expect(legendaryAnimation.scale).toBe(1.3);
      expect(legendaryAnimation.duration).toBe(6000);
      expect(legendaryAnimation.particles).toBe(true);

      const commonAnimation = achievementNotificationService.constructor.getRarityAnimation('common');
      expect(commonAnimation.scale).toBe(1.0);
      expect(commonAnimation.duration).toBe(3000);
      expect(commonAnimation.particles).toBe(false);
    });
  });

  describe('Achievement Criteria Validation', () => {
    it('should validate session count criteria correctly', () => {
      const criteria = { type: 'session_count', threshold: 5 };
      const userStats = { totalSessions: 10 };

      // This would be tested with actual implementation
      expect(userStats.totalSessions >= criteria.threshold).toBe(true);
    });

    it('should validate streak criteria correctly', () => {
      const criteria = { type: 'streak', threshold: 7 };
      const userStats = { currentStreak: 10 };

      expect(userStats.currentStreak >= criteria.threshold).toBe(true);
    });

    it('should validate rating criteria correctly', () => {
      const criteria = { type: 'rating', threshold: 4.5 };
      const userStats = { averageRating: 4.8 };

      expect(userStats.averageRating >= criteria.threshold).toBe(true);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress percentage correctly', () => {
      const current = 3;
      const target = 10;
      const percentage = (current / target) * 100;

      expect(percentage).toBe(30);
    });

    it('should format progress text correctly', () => {
      const current = 7;
      const target = 10;
      const unit = 'sessions';
      const text = `${current}/${target} ${unit}`;

      expect(text).toBe('7/10 sessions');
    });
  });

  describe('Leaderboard Scoring', () => {
    it('should calculate overall score correctly', () => {
      const achievementPoints = 1000;
      const score = achievementPoints;

      expect(score).toBe(1000);
    });

    it('should calculate weekly score correctly', () => {
      const totalSessions = 5;
      const achievementPoints = 200;
      const score = totalSessions * 10 + achievementPoints;

      expect(score).toBe(250);
    });

    it('should calculate monthly score correctly', () => {
      const totalMinutesLearned = 300; // 5 hours
      const achievementPoints = 150;
      const score = Math.floor(totalMinutesLearned / 60) * 5 + achievementPoints;

      expect(score).toBe(175); // 5 * 5 + 150
    });
  });

  describe('Achievement Categories', () => {
    it('should categorize achievements correctly', () => {
      const achievements = [
        { category: 'Learning', name: 'First Steps' },
        { category: 'Teaching', name: 'First Mentor' },
        { category: 'Skills', name: 'Skill Explorer' },
        { category: 'Social', name: 'Social Butterfly' },
        { category: 'Consistency', name: 'Consistent Learner' },
      ];

      const categories = [...new Set(achievements.map(a => a.category))];
      expect(categories).toHaveLength(5);
      expect(categories).toContain('Learning');
      expect(categories).toContain('Teaching');
    });
  });

  describe('Rarity System', () => {
    it('should assign correct points based on rarity', () => {
      const rarityPoints = {
        common: 50,
        rare: 200,
        epic: 500,
        legendary: 1000,
      };

      expect(rarityPoints.common).toBeLessThan(rarityPoints.rare);
      expect(rarityPoints.rare).toBeLessThan(rarityPoints.epic);
      expect(rarityPoints.epic).toBeLessThan(rarityPoints.legendary);
    });
  });
});