import prisma from '@/lib/prisma';

export interface DetailedFeedback {
  rating: number;
  feedback?: string;
  skillsLearned: string[];
  skillsTaught: string[];
  learningOutcomes: string[];
  difficultyLevel?: 1 | 2 | 3 | 4 | 5;
  paceRating?: 1 | 2 | 3 | 4 | 5;
  communicationRating?: 1 | 2 | 3 | 4 | 5;
  technicalIssues: string[];
  wouldRecommendPartner?: boolean;
  improvementSuggestions?: string;
  sharedResources: SharedResource[];
}

export interface SharedResource {
  type: 'link' | 'file' | 'code' | 'note';
  title: string;
  content: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface SessionHistoryFilters {
  page: number;
  limit: number;
  search?: string;
  sessionType?: 'learning' | 'teaching' | 'collaboration' | '';
  dateFrom?: Date;
  dateTo?: Date;
  minRating?: number;
  partnerId?: string;
  topics?: string[];
}

export interface LearningAnalytics {
  overview: {
    totalSessions: number;
    totalHours: number;
    averageRating: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
  };
  skillProgression: SkillProgressionData[];
  learningVelocity: VelocityMetrics;
  sessionDistribution: SessionDistribution;
  performanceTrends: PerformanceTrend[];
  topPartners: PartnerStats[];
  insights?: PersonalizedInsights;
}

export interface SkillProgressionData {
  skillId: string;
  skillName: string;
  category: string;
  initialLevel: number;
  currentLevel: number;
  progressPercentage: number;
  sessionsCount: number;
  hoursSpent: number;
  lastPracticed: Date;
  trend: 'improving' | 'stable' | 'declining';
  milestones: SkillMilestone[];
}

export interface SkillMilestone {
  date: Date;
  level: number;
  achievement?: string;
  sessionId: string;
}

export interface VelocityMetrics {
  sessionsPerWeek: number;
  hoursPerWeek: number;
  skillsLearnedPerMonth: number;
  averageSessionDuration: number;
  peakLearningDays: string[];
  learningConsistency: number; // 0-100 score
}

export interface SessionDistribution {
  byType: { type: string; count: number; percentage: number }[];
  byDayOfWeek: { day: string; count: number; averageRating: number }[];
  byTimeOfDay: { hour: number; count: number; averageRating: number }[];
  byDuration: { range: string; count: number; averageRating: number }[];
}

export interface PerformanceTrend {
  date: Date;
  averageRating: number;
  sessionCount: number;
  hoursLearned: number;
  skillsProgressed: number;
}

export interface PartnerStats {
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  sessionsCount: number;
  averageRating: number;
  totalHours: number;
  skillsShared: string[];
  lastSession: Date;
  compatibility: number;
}

export interface PersonalizedInsights {
  performance: PerformanceInsight[];
  patterns: LearningPattern[];
  recommendations: Recommendation[];
  achievements: AchievementInsight[];
}

export interface PerformanceInsight {
  type: 'improvement' | 'decline' | 'milestone' | 'streak';
  title: string;
  description: string;
  metric: string;
  value: number;
  change: number;
  timeframe: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LearningPattern {
  type: 'time_preference' | 'session_length' | 'skill_focus' | 'partner_preference';
  title: string;
  description: string;
  confidence: number; // 0-100
  data: Record<string, any>;
}

export interface Recommendation {
  type: 'skill' | 'schedule' | 'partner' | 'goal';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionable: boolean;
  estimatedImpact: string;
  data?: Record<string, any>;
}

export interface AchievementInsight {
  type: 'progress' | 'near_completion' | 'suggestion';
  achievementId?: string;
  title: string;
  description: string;
  progress: number; // 0-100
  requirement: string;
}

export class SessionAnalyticsService {
  /**
   * Get comprehensive user analytics
   */
  static async getUserAnalytics(
    userId: string,
    options: {
      timeframe: string;
      includeInsights: boolean;
      includeProgression: boolean;
    }
  ): Promise<LearningAnalytics> {
    try {
      const timeframeDate = this.getTimeframeDate(options.timeframe);

      // Get basic overview
      const overview = await this.getAnalyticsOverview(userId, timeframeDate);

      // Get session distribution
      const sessionDistribution = await this.getSessionDistribution(userId, timeframeDate);

      // Get performance trends
      const performanceTrends = await this.getPerformanceTrends(userId, timeframeDate);

      // Get top partners
      const topPartners = await this.getTopPartners(userId, timeframeDate);

      // Get learning velocity
      const learningVelocity = await this.getLearningVelocity(userId, timeframeDate);

      let skillProgression: SkillProgressionData[] = [];
      if (options.includeProgression) {
        skillProgression = await this.getSkillProgression(userId, timeframeDate);
      }

      let insights: PersonalizedInsights | undefined;
      if (options.includeInsights) {
        insights = await this.generatePersonalizedInsights(userId, 'all');
      }

      return {
        overview,
        skillProgression,
        learningVelocity,
        sessionDistribution,
        performanceTrends,
        topPartners,
        insights
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Get searchable session history with filters
   */
  static async getSessionHistory(
    userId: string,
    filters: SessionHistoryFilters
  ): Promise<{ sessions: any[]; total: number }> {
    try {
      const where: any = {
        OR: [
          { initiatorId: userId },
          { partnerId: userId }
        ],
        status: 'completed'
      };

      // Apply filters
      if (filters.sessionType) {
        where.sessionType = filters.sessionType;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.startTime = {};
        if (filters.dateFrom) {
          where.startTime.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.startTime.lte = filters.dateTo;
        }
      }

      if (filters.partnerId) {
        where.OR = [
          { initiatorId: userId, partnerId: filters.partnerId },
          { partnerId: userId, initiatorId: filters.partnerId }
        ];
      }

      if (filters.topics && filters.topics.length > 0) {
        where.topics = {
          hasSome: filters.topics
        };
      }

      if (filters.search) {
        where.OR = [
          ...where.OR,
          {
            topics: {
              hasSome: [filters.search]
            }
          },
          {
            feedbackInitiator: {
              contains: filters.search,
              mode: 'insensitive'
            }
          },
          {
            feedbackPartner: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        ];
      }

      // Get total count
      const total = await prisma.session.count({ where });

      // Get sessions with pagination
      const sessions = await prisma.session.findMany({
        where,
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          partner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      });

      // Filter by rating if specified
      let filteredSessions = sessions;
      if (filters.minRating) {
        filteredSessions = sessions.filter(session => {
          const userRating = session.initiatorId === userId
            ? session.ratingInitiator
            : session.ratingPartner;
          return userRating && userRating >= filters.minRating!;
        });
      }

      return {
        sessions: filteredSessions,
        total
      };
    } catch (error) {
      console.error('Error getting session history:', error);
      throw error;
    }
  }

  /**
   * Submit detailed session feedback
   */
  static async submitDetailedFeedback(
    sessionId: string,
    userId: string,
    feedback: DetailedFeedback
  ): Promise<any> {
    try {
      // Get the session to determine user role
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const isInitiator = session.initiatorId === userId;

      // Update session with detailed feedback
      const updatedSession = await prisma.session.update({
        where: { id: sessionId },
        data: {
          ...(isInitiator ? {
            ratingInitiator: feedback.rating,
            feedbackInitiator: feedback.feedback
          } : {
            ratingPartner: feedback.rating,
            feedbackPartner: feedback.feedback
          })
        }
      });

      // Store detailed feedback in a separate collection (if using MongoDB)
      // For now, we'll store it as JSON in the session metadata
      const detailedFeedbackData = {
        userId,
        sessionId,
        ...feedback,
        submittedAt: new Date()
      };

      // In a real implementation, you might want to create a separate SessionFeedback model
      // For now, we'll return the feedback data
      return {
        session: updatedSession,
        detailedFeedback: detailedFeedbackData
      };
    } catch (error) {
      console.error('Error submitting detailed feedback:', error);
      throw error;
    }
  }

  /**
   * Get session feedback
   */
  static async getSessionFeedback(sessionId: string, userId: string): Promise<any> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          partner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          }
        }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Check if user was part of this session
      if (session.initiatorId !== userId && session.partnerId !== userId) {
        throw new Error('Unauthorized access to session feedback');
      }

      return {
        session,
        userFeedback: {
          rating: session.initiatorId === userId ? session.ratingInitiator : session.ratingPartner,
          feedback: session.initiatorId === userId ? session.feedbackInitiator : session.feedbackPartner
        },
        partnerFeedback: {
          rating: session.initiatorId === userId ? session.ratingPartner : session.ratingInitiator,
          feedback: session.initiatorId === userId ? session.feedbackPartner : session.feedbackInitiator
        }
      };
    } catch (error) {
      console.error('Error getting session feedback:', error);
      throw error;
    }
  }

  /**
   * Generate personalized insights
   */
  static async generatePersonalizedInsights(
    userId: string,
    type: string
  ): Promise<PersonalizedInsights> {
    try {
      const performance = await this.generatePerformanceInsights(userId);
      const patterns = await this.generateLearningPatterns(userId);
      const recommendations = await this.generateRecommendations(userId);
      const achievements = await this.generateAchievementInsights(userId);

      return {
        performance,
        patterns,
        recommendations,
        achievements
      };
    } catch (error) {
      console.error('Error generating personalized insights:', error);
      throw error;
    }
  }

  // Private helper methods

  private static getTimeframeDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // All time
    }
  }

  private static async getAnalyticsOverview(userId: string, fromDate: Date) {
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { partnerId: userId }
        ],
        status: 'completed',
        startTime: {
          gte: fromDate
        }
      }
    });

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 100) / 100;

    const ratings = sessions.flatMap(session => [
      session.ratingInitiator,
      session.ratingPartner
    ]).filter(rating => rating !== null) as number[];

    const averageRating = ratings.length > 0
      ? Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length * 100) / 100
      : 0;

    // Get user stats for streaks
    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    return {
      totalSessions,
      totalHours,
      averageRating,
      completionRate: 100, // Assuming all fetched sessions are completed
      currentStreak: userStats?.currentStreak || 0,
      longestStreak: userStats?.longestStreak || 0
    };
  }

  private static async getSessionDistribution(userId: string, fromDate: Date): Promise<SessionDistribution> {
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { partnerId: userId }
        ],
        status: 'completed',
        startTime: {
          gte: fromDate
        }
      }
    });

    // Distribution by type
    const typeDistribution = sessions.reduce((acc, session) => {
      acc[session.sessionType] = (acc[session.sessionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = Object.entries(typeDistribution).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / sessions.length) * 100)
    }));

    // Distribution by day of week
    const dayDistribution = sessions.reduce((acc, session) => {
      const day = session.startTime.toLocaleDateString('en-US', { weekday: 'long' });
      if (!acc[day]) {
        acc[day] = { count: 0, ratings: [] };
      }
      acc[day].count++;
      const rating = session.initiatorId === userId ? session.ratingInitiator : session.ratingPartner;
      if (rating) acc[day].ratings.push(rating);
      return acc;
    }, {} as Record<string, { count: number; ratings: number[] }>);

    const byDayOfWeek = Object.entries(dayDistribution).map(([day, data]) => ({
      day,
      count: data.count,
      averageRating: data.ratings.length > 0
        ? Math.round(data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length * 100) / 100
        : 0
    }));

    // Distribution by time of day
    const hourDistribution = sessions.reduce((acc, session) => {
      const hour = session.startTime.getHours();
      if (!acc[hour]) {
        acc[hour] = { count: 0, ratings: [] };
      }
      acc[hour].count++;
      const rating = session.initiatorId === userId ? session.ratingInitiator : session.ratingPartner;
      if (rating) acc[hour].ratings.push(rating);
      return acc;
    }, {} as Record<number, { count: number; ratings: number[] }>);

    const byTimeOfDay = Object.entries(hourDistribution).map(([hour, data]) => ({
      hour: parseInt(hour),
      count: data.count,
      averageRating: data.ratings.length > 0
        ? Math.round(data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length * 100) / 100
        : 0
    }));

    // Distribution by duration
    const durationRanges = [
      { range: '0-30 min', min: 0, max: 30 },
      { range: '30-60 min', min: 30, max: 60 },
      { range: '60-90 min', min: 60, max: 90 },
      { range: '90+ min', min: 90, max: Infinity }
    ];

    const byDuration = durationRanges.map(({ range, min, max }) => {
      const sessionsInRange = sessions.filter(session => {
        const duration = session.durationMinutes || 0;
        return duration >= min && duration < max;
      });

      const ratings = sessionsInRange.map(session =>
        session.initiatorId === userId ? session.ratingInitiator : session.ratingPartner
      ).filter(rating => rating !== null) as number[];

      return {
        range,
        count: sessionsInRange.length,
        averageRating: ratings.length > 0
          ? Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length * 100) / 100
          : 0
      };
    });

    return {
      byType,
      byDayOfWeek,
      byTimeOfDay,
      byDuration
    };
  }

  private static async getPerformanceTrends(userId: string, fromDate: Date): Promise<PerformanceTrend[]> {
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { partnerId: userId }
        ],
        status: 'completed',
        startTime: {
          gte: fromDate
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Group sessions by week
    const weeklyData = sessions.reduce((acc, session) => {
      const weekStart = new Date(session.startTime);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!acc[weekKey]) {
        acc[weekKey] = {
          date: weekStart,
          sessions: [],
          totalHours: 0,
          ratings: []
        };
      }

      acc[weekKey].sessions.push(session);
      acc[weekKey].totalHours += (session.durationMinutes || 0) / 60;

      const rating = session.initiatorId === userId ? session.ratingInitiator : session.ratingPartner;
      if (rating) acc[weekKey].ratings.push(rating);

      return acc;
    }, {} as Record<string, any>);

    return Object.values(weeklyData).map((week: any) => ({
      date: week.date,
      averageRating: week.ratings.length > 0
        ? Math.round(week.ratings.reduce((sum: number, r: number) => sum + r, 0) / week.ratings.length * 100) / 100
        : 0,
      sessionCount: week.sessions.length,
      hoursLearned: Math.round(week.totalHours * 100) / 100,
      skillsProgressed: 0 // This would require more complex skill tracking
    }));
  }

  private static async getTopPartners(userId: string, fromDate: Date): Promise<PartnerStats[]> {
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { partnerId: userId }
        ],
        status: 'completed',
        startTime: {
          gte: fromDate
        }
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        partner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    const partnerStats = sessions.reduce((acc, session) => {
      const partner = session.initiatorId === userId ? session.partner : session.initiator;
      const partnerId = partner.id;

      if (!acc[partnerId]) {
        acc[partnerId] = {
          partnerId,
          partnerName: partner.username,
          partnerAvatar: partner.avatarUrl,
          sessions: [],
          totalMinutes: 0,
          ratings: []
        };
      }

      acc[partnerId].sessions.push(session);
      acc[partnerId].totalMinutes += session.durationMinutes || 0;

      const rating = session.initiatorId === userId ? session.ratingInitiator : session.ratingPartner;
      if (rating) acc[partnerId].ratings.push(rating);

      return acc;
    }, {} as Record<string, any>);

    return Object.values(partnerStats)
      .map((partner: any) => ({
        partnerId: partner.partnerId,
        partnerName: partner.partnerName,
        partnerAvatar: partner.partnerAvatar,
        sessionsCount: partner.sessions.length,
        averageRating: partner.ratings.length > 0
          ? Math.round(partner.ratings.reduce((sum: number, r: number) => sum + r, 0) / partner.ratings.length * 100) / 100
          : 0,
        totalHours: Math.round(partner.totalMinutes / 60 * 100) / 100,
        skillsShared: [], // Would require skill tracking
        lastSession: partner.sessions[partner.sessions.length - 1].startTime,
        compatibility: partner.ratings.length > 0
          ? Math.round(partner.ratings.reduce((sum: number, r: number) => sum + r, 0) / partner.ratings.length * 20) // Convert to 0-100 scale
          : 0
      }))
      .sort((a, b) => b.sessionsCount - a.sessionsCount)
      .slice(0, 10);
  }

  private static async getLearningVelocity(userId: string, fromDate: Date): Promise<VelocityMetrics> {
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { partnerId: userId }
        ],
        status: 'completed',
        startTime: {
          gte: fromDate
        }
      }
    });

    const totalWeeks = Math.max(1, Math.ceil((Date.now() - fromDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const totalMinutes = sessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);

    const sessionsPerWeek = Math.round(sessions.length / totalWeeks * 100) / 100;
    const hoursPerWeek = Math.round(totalMinutes / 60 / totalWeeks * 100) / 100;
    const averageSessionDuration = sessions.length > 0
      ? Math.round(totalMinutes / sessions.length * 100) / 100
      : 0;

    // Calculate peak learning days
    const dayCount = sessions.reduce((acc, session) => {
      const day = session.startTime.toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const peakLearningDays = Object.entries(dayCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    // Calculate learning consistency (simplified)
    const learningConsistency = Math.min(100, Math.round(sessionsPerWeek * 20));

    return {
      sessionsPerWeek,
      hoursPerWeek,
      skillsLearnedPerMonth: 0, // Would require skill tracking
      averageSessionDuration,
      peakLearningDays,
      learningConsistency
    };
  }

  private static async getSkillProgression(userId: string, fromDate: Date): Promise<SkillProgressionData[]> {
    // This would require more sophisticated skill tracking
    // For now, return empty array
    return [];
  }

  private static async generatePerformanceInsights(userId: string): Promise<PerformanceInsight[]> {
    // Generate performance insights based on user data
    const insights: PerformanceInsight[] = [];

    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (userStats) {
      if (userStats.currentStreak >= 7) {
        insights.push({
          type: 'streak',
          title: 'Great Learning Streak!',
          description: `You're on a ${userStats.currentStreak}-day learning streak. Keep it up!`,
          metric: 'streak',
          value: userStats.currentStreak,
          change: 0,
          timeframe: 'current',
          severity: 'low'
        });
      }

      if (userStats.averageRating && userStats.averageRating >= 4.5) {
        insights.push({
          type: 'milestone',
          title: 'Excellent Ratings',
          description: 'Your average session rating is outstanding!',
          metric: 'rating',
          value: userStats.averageRating,
          change: 0,
          timeframe: 'all_time',
          severity: 'low'
        });
      }
    }

    return insights;
  }

  private static async generateLearningPatterns(userId: string): Promise<LearningPattern[]> {
    // Generate learning patterns based on session data
    return [];
  }

  private static async generateRecommendations(userId: string): Promise<Recommendation[]> {
    // Generate personalized recommendations
    return [];
  }

  private static async generateAchievementInsights(userId: string): Promise<AchievementInsight[]> {
    // Generate achievement-related insights
    return [];
  }
}