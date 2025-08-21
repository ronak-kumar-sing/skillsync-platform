import prisma from '../lib/prisma';
import { MATCHING_WEIGHTS, MATCHING_THRESHOLDS, SESSION_COMPATIBILITY, QUEUE_EXPIRATION } from '../lib/matching-config';
import { MatchingAnalytics } from '../lib/matching-analytics';
import {
  UserProfile,
  UserSkill,
  AvailabilitySchedule,
  TimeSlot,
} from '../types';

// Matching algorithm interfaces
export interface MatchingRequest {
  userId: string;
  preferredSkills: string[];
  sessionType: 'learning' | 'teaching' | 'collaboration';
  maxDuration: number;
  urgency: 'low' | 'medium' | 'high';
}

export interface MatchResult {
  partnerId: string;
  compatibilityScore: number;
  scoreBreakdown: CompatibilityScoreBreakdown;
  estimatedWaitTime?: number;
}

export interface CompatibilityScoreBreakdown {
  skillCompatibility: number;
  timezoneCompatibility: number;
  availabilityCompatibility: number;
  communicationCompatibility: number;
  sessionHistoryCompatibility: number;
  totalScore: number;
}

export interface MatchingCandidate {
  user: UserProfile;
  compatibilityScore: number;
  scoreBreakdown: CompatibilityScoreBreakdown;
}

// Matching weights are now imported from configuration

export class MatchingService {
  /**
   * Find the best match for a user based on AI-powered compatibility scoring
   */
  static async findMatch(request: MatchingRequest): Promise<MatchResult | null> {
    const startTime = Date.now();
    let matchFound = false;
    let compatibilityScore = 0;

    // Get the requesting user's profile
    const requesterProfile = await this.getUserProfileForMatching(request.userId);
    if (!requesterProfile) {
      throw new Error('User profile not found');
    }

    // Get potential candidates from the matching queue
    const candidates = await this.getPotentialCandidates(request, requesterProfile);

    if (candidates.length === 0) {
      return null; // No matches available
    }

    // Calculate compatibility scores for all candidates
    const scoredCandidates = await Promise.all(
      candidates.map(candidate => this.calculateCompatibilityScore(
        requesterProfile,
        candidate,
        request
      ))
    );

    // Sort by compatibility score (highest first)
    scoredCandidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Filter candidates that meet minimum thresholds
    const qualifiedCandidates = scoredCandidates.filter(candidate =>
      candidate.compatibilityScore >= MATCHING_THRESHOLDS.MINIMUM_TOTAL_SCORE &&
      candidate.scoreBreakdown.skillCompatibility >= MATCHING_THRESHOLDS.MINIMUM_SKILL_SCORE &&
      candidate.scoreBreakdown.availabilityCompatibility >= MATCHING_THRESHOLDS.MINIMUM_AVAILABILITY_SCORE
    );

    if (qualifiedCandidates.length === 0) {
      // Record analytics for failed match
      await MatchingAnalytics.recordMatchingAttempt({
        timestamp: new Date(),
        userId: request.userId,
        matchFound: false,
        matchTimeMs: Date.now() - startTime,
        queuePosition: candidates.length,
      });

      return null; // No qualified matches
    }

    // Return the best qualified match
    const bestMatch = qualifiedCandidates[0];
    const processingTime = Date.now() - startTime;
    matchFound = true;
    compatibilityScore = bestMatch.compatibilityScore;

    // Record analytics for successful match
    await MatchingAnalytics.recordMatchingAttempt({
      timestamp: new Date(),
      userId: request.userId,
      matchFound: true,
      compatibilityScore: bestMatch.compatibilityScore,
      matchTimeMs: processingTime,
      queuePosition: candidates.length,
    });

    return {
      partnerId: bestMatch.user.id,
      compatibilityScore: bestMatch.compatibilityScore,
      scoreBreakdown: bestMatch.scoreBreakdown,
      estimatedWaitTime: processingTime,
    };
  }

  /**
   * Get user profile optimized for matching calculations
   */
  private static async getUserProfileForMatching(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSkills: {
          include: {
            skill: true,
          },
        },
        learningGoals: true,
        userPreferences: true,
        userAchievements: {
          include: {
            achievement: true,
          },
        },
        initiatedSessions: {
          where: {
            status: 'completed',
          },
          select: {
            ratingPartner: true,
            sessionType: true,
            durationMinutes: true,
            createdAt: true,
          },
        },
        partnerSessions: {
          where: {
            status: 'completed',
          },
          select: {
            ratingInitiator: true,
            sessionType: true,
            durationMinutes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) return null;

    // Get user stats
    const userStats = await prisma.userStats.findUnique({
      where: { userId: user.id },
    });

    // Transform to UserProfile format (simplified for matching)
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastActive: user.lastActive,
      skills: user.userSkills.map(us => ({
        id: us.id,
        skillId: us.skillId,
        skill: {
          id: us.skill.id,
          name: us.skill.name,
          category: us.skill.category,
          description: us.skill.description,
          createdAt: us.skill.createdAt,
        },
        proficiencyLevel: us.proficiencyLevel as 1 | 2 | 3 | 4 | 5,
        verified: us.verified,
        endorsements: us.endorsements,
        createdAt: us.createdAt,
      })),
      learningGoals: user.learningGoals.map(lg => ({
        id: lg.id,
        title: lg.title,
        description: lg.description,
        targetDate: lg.targetDate,
        priority: lg.priority as 'low' | 'medium' | 'high',
        status: lg.status as 'active' | 'completed' | 'paused',
        createdAt: lg.createdAt,
        updatedAt: lg.updatedAt,
      })),
      preferences: user.userPreferences ? {
        id: user.userPreferences.id,
        preferredSessionTypes: user.userPreferences.preferredSessionTypes as ('learning' | 'teaching' | 'collaboration')[],
        maxSessionDuration: user.userPreferences.maxSessionDuration,
        communicationStyle: user.userPreferences.communicationStyle as 'formal' | 'casual' | 'balanced',
        availabilitySchedule: user.userPreferences.availabilitySchedule as AvailabilitySchedule,
        languagePreferences: user.userPreferences.languagePreferences,
        createdAt: user.userPreferences.createdAt,
        updatedAt: user.userPreferences.updatedAt,
      } : null,
      stats: userStats ? {
        id: userStats.id,
        totalSessions: userStats.totalSessions,
        totalMinutesLearned: userStats.totalMinutesLearned,
        averageRating: userStats.averageRating,
        skillsLearned: userStats.skillsLearned,
        skillsTaught: userStats.skillsTaught,
        achievementPoints: userStats.achievementPoints,
        currentStreak: userStats.currentStreak,
        longestStreak: userStats.longestStreak,
        lastSessionDate: userStats.lastSessionDate,
        createdAt: userStats.createdAt,
        updatedAt: userStats.updatedAt,
      } : null,
      achievements: user.userAchievements.map(ua => ({
        id: ua.id,
        achievementId: ua.achievementId,
        achievement: {
          id: ua.achievement.id,
          name: ua.achievement.name,
          description: ua.achievement.description,
          iconUrl: ua.achievement.iconUrl,
          category: ua.achievement.category,
          points: ua.achievement.points,
          rarity: ua.achievement.rarity as 'common' | 'rare' | 'epic' | 'legendary',
          criteria: ua.achievement.criteria,
          createdAt: ua.achievement.createdAt,
        },
        earnedAt: ua.earnedAt,
        progress: ua.progress,
      })),
    };
  }

  /**
   * Get potential matching candidates from the Redis-based queue
   */
  private static async getPotentialCandidates(
    request: MatchingRequest,
    requesterProfile: UserProfile
  ): Promise<UserProfile[]> {
    const { QueueManagerService } = await import('./queue-manager.service');

    // Get candidates from Redis queue with priority handling
    const queueEntries = await QueueManagerService.getNextCandidates(
      request.userId,
      request.sessionType,
      20 // Get up to 20 candidates for matching
    );

    const candidates: UserProfile[] = [];

    for (const entry of queueEntries) {
      // Get full user profile for matching
      const candidate = await this.getUserProfileForMatching(entry.userId);

      if (candidate && candidate.isActive) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Get compatible session types for matching
   */
  private static getCompatibleSessionTypes(sessionType: string): string[] {
    return SESSION_COMPATIBILITY[sessionType as keyof typeof SESSION_COMPATIBILITY] || ['collaboration'];
  }

  /**
   * Calculate comprehensive compatibility score between two users
   */
  private static async calculateCompatibilityScore(
    requester: UserProfile,
    candidate: UserProfile,
    request: MatchingRequest
  ): Promise<MatchingCandidate> {
    // Calculate individual compatibility scores
    const skillScore = this.calculateSkillCompatibility(
      requester.skills,
      candidate.skills,
      request.preferredSkills,
      request.sessionType
    );

    const timezoneScore = this.calculateTimezoneCompatibility(
      requester.timezone,
      candidate.timezone
    );

    const availabilityScore = this.calculateAvailabilityCompatibility(
      requester.preferences?.availabilitySchedule,
      candidate.preferences?.availabilitySchedule
    );

    const communicationScore = this.calculateCommunicationCompatibility(
      requester.preferences,
      candidate.preferences
    );

    const sessionHistoryScore = await this.calculateSessionHistoryCompatibility(
      requester.id,
      candidate.id,
      requester.stats,
      candidate.stats
    );

    // Calculate weighted total score
    const totalScore =
      (skillScore * MATCHING_WEIGHTS.SKILL_COMPATIBILITY) +
      (timezoneScore * MATCHING_WEIGHTS.TIMEZONE_COMPATIBILITY) +
      (availabilityScore * MATCHING_WEIGHTS.AVAILABILITY_COMPATIBILITY) +
      (communicationScore * MATCHING_WEIGHTS.COMMUNICATION_COMPATIBILITY) +
      (sessionHistoryScore * MATCHING_WEIGHTS.SESSION_HISTORY_COMPATIBILITY);

    const scoreBreakdown: CompatibilityScoreBreakdown = {
      skillCompatibility: skillScore,
      timezoneCompatibility: timezoneScore,
      availabilityCompatibility: availabilityScore,
      communicationCompatibility: communicationScore,
      sessionHistoryCompatibility: sessionHistoryScore,
      totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
    };

    return {
      user: candidate,
      compatibilityScore: scoreBreakdown.totalScore,
      scoreBreakdown,
    };
  }
  /**
   *
 Calculate skill compatibility score based on skill levels and complementarity
   */
  private static calculateSkillCompatibility(
    requesterSkills: UserSkill[],
    candidateSkills: UserSkill[],
    preferredSkills: string[],
    sessionType: string
  ): number {
    if (requesterSkills.length === 0 || candidateSkills.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let matchedSkills = 0;

    // Create skill maps for efficient lookup
    const requesterSkillMap = new Map(
      requesterSkills.map(skill => [skill.skill.name.toLowerCase(), skill])
    );
    const candidateSkillMap = new Map(
      candidateSkills.map(skill => [skill.skill.name.toLowerCase(), skill])
    );

    // Check preferred skills first (higher weight)
    for (const preferredSkill of preferredSkills) {
      const requesterSkill = requesterSkillMap.get(preferredSkill.toLowerCase());
      const candidateSkill = candidateSkillMap.get(preferredSkill.toLowerCase());

      if (requesterSkill && candidateSkill) {
        const complementarityScore = this.calculateSkillComplementarity(
          requesterSkill.proficiencyLevel,
          candidateSkill.proficiencyLevel,
          sessionType
        );
        totalScore += complementarityScore * 2; // Double weight for preferred skills
        matchedSkills += 2;
      }
    }

    // Check other overlapping skills
    for (const [skillName, requesterSkill] of requesterSkillMap) {
      if (preferredSkills.some(ps => ps.toLowerCase() === skillName)) {
        continue; // Already processed in preferred skills
      }

      const candidateSkill = candidateSkillMap.get(skillName);
      if (candidateSkill) {
        const complementarityScore = this.calculateSkillComplementarity(
          requesterSkill.proficiencyLevel,
          candidateSkill.proficiencyLevel,
          sessionType
        );
        totalScore += complementarityScore;
        matchedSkills += 1;
      }
    }

    // If no skills match, return very low score
    if (matchedSkills === 0) {
      return 0.1;
    }

    // Calculate average score with bonus for multiple matches
    const averageScore = totalScore / matchedSkills;
    const matchBonus = Math.min(matchedSkills / 10, 0.2); // Up to 20% bonus for many matches

    return Math.min(averageScore + matchBonus, 1.0);
  }

  /**
   * Calculate skill complementarity based on proficiency levels and session type
   */
  private static calculateSkillComplementarity(
    requesterLevel: number,
    candidateLevel: number,
    sessionType: string
  ): number {
    const levelDiff = Math.abs(requesterLevel - candidateLevel);

    switch (sessionType) {
      case 'learning':
        // Learner benefits from someone with higher skill level
        if (candidateLevel > requesterLevel) {
          // Ideal gap is 1-2 levels
          if (levelDiff === 1) return 1.0;
          if (levelDiff === 2) return 0.9;
          if (levelDiff === 3) return 0.7;
          return 0.5; // Too big gap
        } else if (candidateLevel === requesterLevel) {
          return 0.6; // Peer learning is okay
        } else {
          return 0.3; // Not ideal for learning
        }

      case 'teaching':
        // Teacher should have higher skill level than learner
        if (requesterLevel > candidateLevel) {
          if (levelDiff === 1) return 1.0;
          if (levelDiff === 2) return 0.9;
          if (levelDiff === 3) return 0.7;
          return 0.5;
        } else if (requesterLevel === candidateLevel) {
          return 0.4; // Can still share knowledge
        } else {
          return 0.2; // Not ideal for teaching
        }

      case 'collaboration':
        // Collaboration works best with similar or complementary levels
        if (levelDiff === 0) return 1.0; // Same level is perfect
        if (levelDiff === 1) return 0.9; // Slight difference is good
        if (levelDiff === 2) return 0.7; // Still workable
        return 0.4; // Large gaps are challenging for collaboration

      default:
        return 0.5;
    }
  }

  /**
   * Calculate timezone compatibility score
   */
  private static calculateTimezoneCompatibility(
    requesterTimezone: string,
    candidateTimezone: string
  ): number {
    try {
      // Get current time in both timezones
      const now = new Date();
      const requesterTime = new Date(now.toLocaleString('en-US', { timeZone: requesterTimezone }));
      const candidateTime = new Date(now.toLocaleString('en-US', { timeZone: candidateTimezone }));

      // Calculate hour difference
      const hourDiff = Math.abs(requesterTime.getHours() - candidateTime.getHours());
      const adjustedDiff = Math.min(hourDiff, 24 - hourDiff); // Handle wrap-around

      // Score based on time difference
      if (adjustedDiff === 0) return 1.0; // Same timezone
      if (adjustedDiff <= 2) return 0.9;  // Very close
      if (adjustedDiff <= 4) return 0.7;  // Manageable
      if (adjustedDiff <= 6) return 0.5;  // Challenging
      if (adjustedDiff <= 8) return 0.3;  // Difficult
      return 0.1; // Very difficult
    } catch (error) {
      // If timezone parsing fails, assume moderate compatibility
      return 0.5;
    }
  }

  /**
   * Calculate availability compatibility score
   */
  private static calculateAvailabilityCompatibility(
    requesterSchedule?: AvailabilitySchedule | null,
    candidateSchedule?: AvailabilitySchedule | null
  ): number {
    if (!requesterSchedule || !candidateSchedule) {
      return 0.5; // Default score if no schedule data
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let totalOverlap = 0;
    let totalPossibleOverlap = 0;

    for (const day of days) {
      const requesterSlots = requesterSchedule[day] || [];
      const candidateSlots = candidateSchedule[day] || [];

      if (requesterSlots.length === 0 || candidateSlots.length === 0) {
        continue;
      }

      const dayOverlap = this.calculateTimeSlotOverlap(requesterSlots, candidateSlots);
      totalOverlap += dayOverlap;
      totalPossibleOverlap += Math.max(
        this.getTotalSlotDuration(requesterSlots),
        this.getTotalSlotDuration(candidateSlots)
      );
    }

    if (totalPossibleOverlap === 0) {
      return 0.1; // No availability data
    }

    const overlapRatio = totalOverlap / totalPossibleOverlap;

    // Boost score if there's any overlap
    if (overlapRatio > 0) {
      return Math.min(overlapRatio * 2, 1.0); // Double the ratio, cap at 1.0
    }

    return 0.1;
  }

  /**
   * Calculate overlap between time slots
   */
  private static calculateTimeSlotOverlap(slots1: TimeSlot[], slots2: TimeSlot[]): number {
    let totalOverlap = 0;

    for (const slot1 of slots1) {
      for (const slot2 of slots2) {
        const overlap = this.getTimeSlotOverlapMinutes(slot1, slot2);
        totalOverlap += overlap;
      }
    }

    return totalOverlap;
  }

  /**
   * Get overlap in minutes between two time slots
   */
  private static getTimeSlotOverlapMinutes(slot1: TimeSlot, slot2: TimeSlot): number {
    const start1 = this.timeToMinutes(slot1.start);
    const end1 = this.timeToMinutes(slot1.end);
    const start2 = this.timeToMinutes(slot2.start);
    const end2 = this.timeToMinutes(slot2.end);

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    return Math.max(0, overlapEnd - overlapStart);
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  private static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get total duration of time slots in minutes
   */
  private static getTotalSlotDuration(slots: TimeSlot[]): number {
    return slots.reduce((total, slot) => {
      const start = this.timeToMinutes(slot.start);
      const end = this.timeToMinutes(slot.end);
      return total + (end - start);
    }, 0);
  }

  /**
   * Calculate communication compatibility score
   */
  private static calculateCommunicationCompatibility(
    requesterPrefs: UserProfile['preferences'],
    candidatePrefs: UserProfile['preferences']
  ): number {
    if (!requesterPrefs || !candidatePrefs) {
      return 0.5; // Default score if no preferences
    }

    let score = 0;
    let factors = 0;

    // Communication style compatibility
    if (requesterPrefs.communicationStyle && candidatePrefs.communicationStyle) {
      if (requesterPrefs.communicationStyle === candidatePrefs.communicationStyle) {
        score += 1.0;
      } else if (
        (requesterPrefs.communicationStyle === 'balanced') ||
        (candidatePrefs.communicationStyle === 'balanced')
      ) {
        score += 0.8; // Balanced style is compatible with others
      } else {
        score += 0.4; // Different styles can still work
      }
      factors++;
    }

    // Language preferences compatibility
    const commonLanguages = requesterPrefs.languagePreferences.filter(lang =>
      candidatePrefs.languagePreferences.includes(lang)
    );
    if (commonLanguages.length > 0) {
      score += 1.0;
    } else {
      score += 0.2; // Assume some basic communication possible
    }
    factors++;

    // Session duration compatibility
    const durationDiff = Math.abs(
      requesterPrefs.maxSessionDuration - candidatePrefs.maxSessionDuration
    );
    if (durationDiff <= 15) {
      score += 1.0;
    } else if (durationDiff <= 30) {
      score += 0.8;
    } else if (durationDiff <= 60) {
      score += 0.6;
    } else {
      score += 0.3;
    }
    factors++;

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Calculate session history and rating-based compatibility
   */
  private static async calculateSessionHistoryCompatibility(
    requesterId: string,
    candidateId: string,
    requesterStats: UserProfile['stats'],
    candidateStats: UserProfile['stats']
  ): number {
    // Check if users have had sessions together before
    const previousSessions = await prisma.session.findMany({
      where: {
        OR: [
          { initiatorId: requesterId, partnerId: candidateId },
          { initiatorId: candidateId, partnerId: requesterId },
        ],
        status: 'completed',
      },
      select: {
        ratingInitiator: true,
        ratingPartner: true,
        sessionType: true,
        createdAt: true,
      },
    });

    let score = 0.5; // Base score

    // If they've had sessions before, use that data
    if (previousSessions.length > 0) {
      const ratings = previousSessions.flatMap(session =>
        [session.ratingInitiator, session.ratingPartner].filter(r => r !== null)
      );

      if (ratings.length > 0) {
        const avgRating = ratings.reduce((sum, rating) => sum + rating!, 0) / ratings.length;
        score = avgRating / 5; // Convert 1-5 rating to 0-1 score

        // Bonus for multiple successful sessions
        if (previousSessions.length > 1 && avgRating >= 4) {
          score = Math.min(score + 0.2, 1.0);
        }
      }
    } else {
      // No previous sessions, use individual stats
      if (requesterStats && candidateStats) {
        let statScore = 0;
        let statFactors = 0;

        // Average rating compatibility
        if (requesterStats.averageRating && candidateStats.averageRating) {
          const avgRating = (requesterStats.averageRating + candidateStats.averageRating) / 2;
          statScore += avgRating / 5;
          statFactors++;
        }

        // Experience level compatibility
        const requesterExperience = requesterStats.totalSessions;
        const candidateExperience = candidateStats.totalSessions;

        if (requesterExperience > 0 && candidateExperience > 0) {
          const experienceRatio = Math.min(requesterExperience, candidateExperience) /
                                 Math.max(requesterExperience, candidateExperience);
          statScore += experienceRatio;
          statFactors++;
        }

        // Activity level compatibility (current streak)
        const requesterStreak = requesterStats.currentStreak;
        const candidateStreak = candidateStats.currentStreak;

        if (requesterStreak > 0 && candidateStreak > 0) {
          const streakRatio = Math.min(requesterStreak, candidateStreak) /
                             Math.max(requesterStreak, candidateStreak);
          statScore += streakRatio;
          statFactors++;
        }

        if (statFactors > 0) {
          score = statScore / statFactors;
        }
      }
    }

    return Math.max(0.1, Math.min(score, 1.0));
  }

  /**
   * Add user to matching queue (now uses Redis-based queue management)
   */
  static async addToQueue(request: MatchingRequest): Promise<void> {
    const { QueueManagerService } = await import('./queue-manager.service');
    await QueueManagerService.addToQueue(request);
  }

  /**
   * Remove user from matching queue (now uses Redis-based queue management)
   */
  static async removeFromQueue(userId: string): Promise<void> {
    const { QueueManagerService } = await import('./queue-manager.service');
    await QueueManagerService.removeFromQueue(userId);
  }

  /**
   * Get queue expiration time based on urgency
   */
  private static getQueueExpirationMinutes(urgency: string): number {
    switch (urgency) {
      case 'high':
        return QUEUE_EXPIRATION.HIGH_URGENCY;
      case 'medium':
        return QUEUE_EXPIRATION.MEDIUM_URGENCY;
      case 'low':
        return QUEUE_EXPIRATION.LOW_URGENCY;
      default:
        return QUEUE_EXPIRATION.MEDIUM_URGENCY;
    }
  }

  /**
   * Clean up expired queue entries
   */
  static async cleanupExpiredQueue(): Promise<void> {
    await prisma.matchingQueue.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    totalInQueue: number;
    bySessionType: Record<string, number>;
    byUrgency: Record<string, number>;
    averageWaitTime: number;
  }> {
    const queueEntries = await prisma.matchingQueue.findMany({
      where: {
        status: 'waiting',
        expiresAt: { gt: new Date() },
      },
      select: {
        sessionType: true,
        urgency: true,
        createdAt: true,
      },
    });

    const totalInQueue = queueEntries.length;

    const bySessionType = queueEntries.reduce((acc, entry) => {
      acc[entry.sessionType] = (acc[entry.sessionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byUrgency = queueEntries.reduce((acc, entry) => {
      acc[entry.urgency] = (acc[entry.urgency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average wait time (simplified)
    const now = new Date();
    const waitTimes = queueEntries.map(entry =>
      now.getTime() - entry.createdAt.getTime()
    );
    const averageWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length / 1000 / 60 // Convert to minutes
      : 0;

    return {
      totalInQueue,
      bySessionType,
      byUrgency,
      averageWaitTime,
    };
  }
}