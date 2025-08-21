/**
 * Configuration constants and utilities for the AI matching algorithm
 */

// Matching algorithm weights (must total 100%)
export const MATCHING_WEIGHTS = {
  SKILL_COMPATIBILITY: 0.30,      // 30% - Most important factor
  TIMEZONE_COMPATIBILITY: 0.15,   // 15% - Important for scheduling
  AVAILABILITY_COMPATIBILITY: 0.15, // 15% - Important for scheduling
  COMMUNICATION_COMPATIBILITY: 0.15, // 15% - Communication preferences
  SESSION_HISTORY_COMPATIBILITY: 0.25, // 25% - Past performance and ratings
} as const;

// Skill complementarity scoring thresholds
export const SKILL_SCORING = {
  PERFECT_MATCH: 1.0,
  EXCELLENT_MATCH: 0.9,
  GOOD_MATCH: 0.7,
  FAIR_MATCH: 0.5,
  POOR_MATCH: 0.3,
  MINIMAL_MATCH: 0.1,
} as const;

// Timezone compatibility thresholds (in hours)
export const TIMEZONE_THRESHOLDS = {
  SAME_ZONE: 0,
  VERY_CLOSE: 2,
  MANAGEABLE: 4,
  CHALLENGING: 6,
  DIFFICULT: 8,
} as const;

// Queue expiration times (in minutes)
export const QUEUE_EXPIRATION = {
  HIGH_URGENCY: 15,
  MEDIUM_URGENCY: 30,
  LOW_URGENCY: 60,
} as const;

// Minimum compatibility scores for matching
export const MATCHING_THRESHOLDS = {
  MINIMUM_TOTAL_SCORE: 0.4,      // 40% minimum compatibility
  MINIMUM_SKILL_SCORE: 0.2,      // 20% minimum skill compatibility
  MINIMUM_AVAILABILITY_SCORE: 0.1, // 10% minimum availability overlap
} as const;

// Session type compatibility matrix
export const SESSION_COMPATIBILITY = {
  learning: ['teaching', 'collaboration'],
  teaching: ['learning', 'collaboration'],
  collaboration: ['collaboration', 'learning', 'teaching'],
} as const;

/**
 * Validate matching algorithm weights
 */
export function validateWeights(): boolean {
  const totalWeight = Object.values(MATCHING_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  return Math.abs(totalWeight - 1.0) < 0.001; // Allow for floating point precision
}

/**
 * Get skill level description
 */
export function getSkillLevelDescription(level: number): string {
  switch (level) {
    case 1:
      return 'Beginner';
    case 2:
      return 'Novice';
    case 3:
      return 'Intermediate';
    case 4:
      return 'Advanced';
    case 5:
      return 'Expert';
    default:
      return 'Unknown';
  }
}

/**
 * Get compatibility score description
 */
export function getCompatibilityDescription(score: number): string {
  if (score >= 0.9) return 'Excellent Match';
  if (score >= 0.8) return 'Very Good Match';
  if (score >= 0.7) return 'Good Match';
  if (score >= 0.6) return 'Fair Match';
  if (score >= 0.4) return 'Poor Match';
  return 'Very Poor Match';
}

/**
 * Get urgency level description
 */
export function getUrgencyDescription(urgency: string): string {
  switch (urgency) {
    case 'high':
      return 'Find match ASAP (15 min timeout)';
    case 'medium':
      return 'Find match soon (30 min timeout)';
    case 'low':
      return 'Find match when available (60 min timeout)';
    default:
      return 'Standard matching';
  }
}

/**
 * Calculate ideal skill level gap for different session types
 */
export function getIdealSkillGap(sessionType: string): number {
  switch (sessionType) {
    case 'learning':
      return 1; // Learner should be 1 level below teacher
    case 'teaching':
      return 1; // Teacher should be 1 level above learner
    case 'collaboration':
      return 0; // Same level is ideal for collaboration
    default:
      return 1;
  }
}

/**
 * Get recommended session duration based on skill levels and type
 */
export function getRecommendedDuration(
  sessionType: string,
  skillLevels: { requester: number; partner: number }
): number {
  const { requester, partner } = skillLevels;
  const avgLevel = (requester + partner) / 2;

  switch (sessionType) {
    case 'learning':
      // Beginners need shorter sessions
      if (avgLevel <= 2) return 45;
      if (avgLevel <= 3) return 60;
      return 90;

    case 'teaching':
      // Teaching sessions can be longer
      if (avgLevel <= 2) return 60;
      if (avgLevel <= 3) return 75;
      return 90;

    case 'collaboration':
      // Collaboration sessions vary by complexity
      if (avgLevel <= 2) return 60;
      if (avgLevel <= 4) return 90;
      return 120;

    default:
      return 60;
  }
}

/**
 * Validate matching request parameters
 */
export function validateMatchingRequest(request: {
  userId: string;
  preferredSkills: string[];
  sessionType: string;
  maxDuration: number;
  urgency: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.userId || request.userId.trim().length === 0) {
    errors.push('User ID is required');
  }

  if (!request.preferredSkills || request.preferredSkills.length === 0) {
    errors.push('At least one preferred skill is required');
  }

  if (!['learning', 'teaching', 'collaboration'].includes(request.sessionType)) {
    errors.push('Invalid session type');
  }

  if (request.maxDuration < 15 || request.maxDuration > 180) {
    errors.push('Session duration must be between 15 and 180 minutes');
  }

  if (!['low', 'medium', 'high'].includes(request.urgency)) {
    errors.push('Invalid urgency level');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}