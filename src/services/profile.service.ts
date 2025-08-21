import prisma from '@/lib/prisma';
import { validateProfileCompletion } from '@/lib/validation';
import {
  UserProfile,
  UpdateProfileRequest,
  AddSkillRequest,
  UpdateSkillRequest,
  CreateLearningGoalRequest,
  UpdateLearningGoalRequest,
  UpdatePreferencesRequest,
  ProfileCompletionStatus,
  ProfileCompletionStep,
  Skill,
} from '@/types';

export class ProfileService {
  /**
   * Get complete user profile with all related data
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSkills: {
          include: {
            skill: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        learningGoals: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        userPreferences: true,
        userAchievements: {
          include: {
            achievement: true,
          },
          orderBy: {
            earnedAt: 'desc',
          },
        },
      },
    });

    if (!user) return null;

    // Get or create user stats
    let userStats = await prisma.userStats.findUnique({
      where: { userId: user.id },
    });

    if (!userStats) {
      userStats = await prisma.userStats.create({
        data: { userId: user.id },
      });
    }

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
        availabilitySchedule: user.userPreferences.availabilitySchedule as any,
        languagePreferences: user.userPreferences.languagePreferences,
        createdAt: user.userPreferences.createdAt,
        updatedAt: user.userPreferences.updatedAt,
      } : null,
      stats: {
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
      },
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
   * Update basic profile information
   */
  static async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    // Check if username is already taken (if updating username)
    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new Error('This username is already taken');
      }
    }

    // Update user profile
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.timezone && { timezone: data.timezone }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl || null }),
        updatedAt: new Date(),
      },
    });

    // Return updated profile
    const updatedProfile = await this.getProfile(userId);
    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated profile');
    }

    return updatedProfile;
  }

  /**
   * Get all available skills
   */
  static async getAvailableSkills(): Promise<Skill[]> {
    const skills = await prisma.skill.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      description: skill.description,
      createdAt: skill.createdAt,
    }));
  }

  /**
   * Add a skill to user profile
   */
  static async addSkill(userId: string, data: AddSkillRequest): Promise<void> {
    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: data.skillId },
    });

    if (!skill) {
      throw new Error('Skill not found');
    }

    // Check if user already has this skill
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId: data.skillId,
        },
      },
    });

    if (existingUserSkill) {
      throw new Error('You already have this skill in your profile');
    }

    // Add skill to user profile
    await prisma.userSkill.create({
      data: {
        userId,
        skillId: data.skillId,
        proficiencyLevel: data.proficiencyLevel,
      },
    });
  }

  /**
   * Update user skill proficiency level
   */
  static async updateSkill(userId: string, skillId: string, data: UpdateSkillRequest): Promise<void> {
    const userSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId,
        },
      },
    });

    if (!userSkill) {
      throw new Error('Skill not found in your profile');
    }

    await prisma.userSkill.update({
      where: {
        userId_skillId: {
          userId,
          skillId,
        },
      },
      data: {
        proficiencyLevel: data.proficiencyLevel,
      },
    });
  }

  /**
   * Remove skill from user profile
   */
  static async removeSkill(userId: string, skillId: string): Promise<void> {
    const userSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId,
        },
      },
    });

    if (!userSkill) {
      throw new Error('Skill not found in your profile');
    }

    await prisma.userSkill.delete({
      where: {
        userId_skillId: {
          userId,
          skillId,
        },
      },
    });
  }

  /**
   * Create a new learning goal
   */
  static async createLearningGoal(userId: string, data: CreateLearningGoalRequest): Promise<void> {
    await prisma.learningGoal.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        priority: data.priority,
      },
    });
  }

  /**
   * Update a learning goal
   */
  static async updateLearningGoal(userId: string, goalId: string, data: UpdateLearningGoalRequest): Promise<void> {
    const goal = await prisma.learningGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!goal) {
      throw new Error('Learning goal not found');
    }

    await prisma.learningGoal.update({
      where: { id: goalId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.targetDate !== undefined && {
          targetDate: data.targetDate ? new Date(data.targetDate) : null
        }),
        ...(data.priority && { priority: data.priority }),
        ...(data.status && { status: data.status }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a learning goal
   */
  static async deleteLearningGoal(userId: string, goalId: string): Promise<void> {
    const goal = await prisma.learningGoal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!goal) {
      throw new Error('Learning goal not found');
    }

    await prisma.learningGoal.delete({
      where: { id: goalId },
    });
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(userId: string, data: UpdatePreferencesRequest): Promise<void> {
    // Check if preferences exist
    const existingPreferences = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (existingPreferences) {
      // Update existing preferences
      await prisma.userPreference.update({
        where: { userId },
        data: {
          ...(data.preferredSessionTypes && { preferredSessionTypes: data.preferredSessionTypes }),
          ...(data.maxSessionDuration && { maxSessionDuration: data.maxSessionDuration }),
          ...(data.communicationStyle && { communicationStyle: data.communicationStyle }),
          ...(data.availabilitySchedule && { availabilitySchedule: data.availabilitySchedule as any }),
          ...(data.languagePreferences && { languagePreferences: data.languagePreferences }),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new preferences
      await prisma.userPreference.create({
        data: {
          userId,
          preferredSessionTypes: data.preferredSessionTypes || ['learning'],
          maxSessionDuration: data.maxSessionDuration || 60,
          communicationStyle: data.communicationStyle || 'balanced',
          availabilitySchedule: (data.availabilitySchedule || {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          }) as any,
          languagePreferences: data.languagePreferences || ['en'],
        },
      });
    }
  }

  /**
   * Get profile completion status
   */
  static async getProfileCompletionStatus(userId: string): Promise<ProfileCompletionStatus> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const validation = validateProfileCompletion(profile);

    const steps: ProfileCompletionStep[] = [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Complete your username and timezone',
        completed: !!profile.username && !!profile.timezone,
        required: true,
        weight: 20,
      },
      {
        id: 'skills',
        title: 'Skills',
        description: 'Add at least one skill to your profile',
        completed: profile.skills.length > 0,
        required: true,
        weight: 30,
      },
      {
        id: 'learning-goals',
        title: 'Learning Goals',
        description: 'Set at least one learning goal',
        completed: profile.learningGoals.length > 0,
        required: true,
        weight: 20,
      },
      {
        id: 'preferences',
        title: 'Preferences',
        description: 'Configure your session preferences',
        completed: !!profile.preferences && profile.preferences.preferredSessionTypes.length > 0,
        required: true,
        weight: 30,
      },
    ];

    return {
      isComplete: validation.isComplete,
      completionPercentage: validation.completionPercentage,
      missingFields: validation.missingFields,
      requiredSteps: steps,
    };
  }

  /**
   * Check if user profile is complete enough for matching
   */
  static async isProfileReadyForMatching(userId: string): Promise<boolean> {
    const completionStatus = await this.getProfileCompletionStatus(userId);
    return completionStatus.isComplete;
  }
}