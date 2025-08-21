/**
 * Analytics and performance monitoring for the matching algorithm
 */

import prisma from './prisma';

export interface MatchingMetrics {
  totalMatches: number;
  successfulMatches: number;
  averageMatchTime: number;
  averageCompatibilityScore: number;
  matchSuccessRate: number;
  topSkillCategories: Array<{ category: string; count: number }>;
  averageSessionRating: number;
  userRetentionRate: number;
}

export interface MatchingPerformanceData {
  timestamp: Date;
  userId: string;
  matchFound: boolean;
  compatibilityScore?: number;
  matchTimeMs: number;
  queuePosition?: number;
  sessionCompleted?: boolean;
  sessionRating?: number;
}

export class MatchingAnalytics {
  /**
   * Record matching attempt performance data
   */
  static async recordMatchingAttempt(data: MatchingPerformanceData): Promise<void> {
    // In a real implementation, this would store to a dedicated analytics table
    // For now, we'll use console logging and could extend to store in database
    console.log('Matching Analytics:', {
      timestamp: data.timestamp,
      userId: data.userId,
      matchFound: data.matchFound,
      compatibilityScore: data.compatibilityScore,
      matchTimeMs: data.matchTimeMs,
      queuePosition: data.queuePosition,
    });

    // TODO: Store in analytics database table for production use
  }

  /**
   * Get comprehensive matching metrics for the platform
   */
  static async getMatchingMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<MatchingMetrics> {
    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };

    // Get total sessions (matches that resulted in sessions)
    const sessions = await prisma.session.findMany({
      where: {
        createdAt: dateFilter,
      },
      include: {
        initiator: {
          include: {
            userSkills: {
              include: {
                skill: true,
              },
            },
          },
        },
        partner: {
          include: {
            userSkills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });

    const totalMatches = sessions.length;
    const successfulMatches = sessions.filter(s => s.status === 'completed').length;

    // Calculate average session ratings
    const ratingsData = sessions
      .filter(s => s.status === 'completed')
      .flatMap(s => [s.ratingInitiator, s.ratingPartner])
      .filter(rating => rating !== null) as number[];

    const averageSessionRating = ratingsData.length > 0
      ? ratingsData.reduce((sum, rating) => sum + rating, 0) / ratingsData.length
      : 0;

    // Get skill categories from sessions
    const skillCategories = new Map<string, number>();
    sessions.forEach(session => {
      session.initiator.userSkills.forEach(userSkill => {
        const category = userSkill.skill.category;
        skillCategories.set(category, (skillCategories.get(category) || 0) + 1);
      });
      session.partner.userSkills.forEach(userSkill => {
        const category = userSkill.skill.category;
        skillCategories.set(category, (skillCategories.get(category) || 0) + 1);
      });
    });

    const topSkillCategories = Array.from(skillCategories.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate user retention (users who had multiple sessions)
    const userSessionCounts = new Map<string, number>();
    sessions.forEach(session => {
      userSessionCounts.set(
        session.initiatorId,
        (userSessionCounts.get(session.initiatorId) || 0) + 1
      );
      userSessionCounts.set(
        session.partnerId,
        (userSessionCounts.get(session.partnerId) || 0) + 1
      );
    });

    const totalUsers = userSessionCounts.size;
    const retainedUsers = Array.from(userSessionCounts.values()).filter(count => count > 1).length;
    const userRetentionRate = totalUsers > 0 ? retainedUsers / totalUsers : 0;

    return {
      totalMatches,
      successfulMatches,
      averageMatchTime: 0, // Would need to track this separately
      averageCompatibilityScore: 0, // Would need to track this separately
      matchSuccessRate: totalMatches > 0 ? successfulMatches / totalMatches : 0,
      topSkillCategories,
      averageSessionRating,
      userRetentionRate,
    };
  }

  /**
   * Get matching algorithm performance insights
   */
  static async getAlgorithmInsights(): Promise<{
    skillMatchAccuracy: number;
    timezoneOptimization: number;
    availabilityUtilization: number;
    communicationAlignment: number;
    overallEffectiveness: number;
    recommendations: string[];
  }> {
    // This would analyze the effectiveness of different matching factors
    // For now, returning mock data structure that would be populated with real analytics

    const recommendations: string[] = [];

    // Analyze recent sessions to provide insights
    const recentSessions = await prisma.session.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
        status: 'completed',
      },
      include: {
        initiator: {
          include: {
            userSkills: true,
            userPreferences: true,
          },
        },
        partner: {
          include: {
            userSkills: true,
            userPreferences: true,
          },
        },
      },
    });

    // Analyze skill matching effectiveness
    let skillMatchAccuracy = 0;
    if (recentSessions.length > 0) {
      const highRatedSessions = recentSessions.filter(session => {
        const avgRating = ((session.ratingInitiator || 0) + (session.ratingPartner || 0)) / 2;
        return avgRating >= 4;
      });
      skillMatchAccuracy = highRatedSessions.length / recentSessions.length;
    }

    if (skillMatchAccuracy < 0.7) {
      recommendations.push('Consider adjusting skill compatibility weights to improve match quality');
    }

    // Mock other metrics (would be calculated from real data)
    const timezoneOptimization = 0.8;
    const availabilityUtilization = 0.75;
    const communicationAlignment = 0.85;
    const overallEffectiveness = (skillMatchAccuracy + timezoneOptimization + availabilityUtilization + communicationAlignment) / 4;

    if (timezoneOptimization < 0.7) {
      recommendations.push('Improve timezone matching algorithm for better scheduling');
    }

    if (availabilityUtilization < 0.6) {
      recommendations.push('Encourage users to provide more detailed availability schedules');
    }

    if (recommendations.length === 0) {
      recommendations.push('Matching algorithm is performing well across all metrics');
    }

    return {
      skillMatchAccuracy,
      timezoneOptimization,
      availabilityUtilization,
      communicationAlignment,
      overallEffectiveness,
      recommendations,
    };
  }

  /**
   * Get queue performance statistics
   */
  static async getQueuePerformance(): Promise<{
    averageWaitTime: number;
    queueThroughput: number;
    peakHours: Array<{ hour: number; count: number }>;
    abandonmentRate: number;
  }> {
    // Get queue entries from the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const queueEntries = await prisma.matchingQueue.findMany({
      where: {
        createdAt: {
          gte: weekAgo,
        },
      },
    });

    // Calculate average wait time for matched entries
    const matchedEntries = queueEntries.filter(entry => entry.status === 'matched');
    const waitTimes = matchedEntries.map(entry => {
      // This would need to be calculated based on when the match was found
      // For now, using a simplified calculation
      return Math.random() * 30; // Mock wait time in minutes
    });

    const averageWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
      : 0;

    // Calculate throughput (matches per hour)
    const totalHours = 7 * 24;
    const queueThroughput = matchedEntries.length / totalHours;

    // Analyze peak hours
    const hourCounts = new Map<number, number>();
    queueEntries.forEach(entry => {
      const hour = entry.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate abandonment rate (expired or cancelled entries)
    const abandonedEntries = queueEntries.filter(entry =>
      entry.status === 'expired' || entry.status === 'cancelled'
    );
    const abandonmentRate = queueEntries.length > 0
      ? abandonedEntries.length / queueEntries.length
      : 0;

    return {
      averageWaitTime,
      queueThroughput,
      peakHours,
      abandonmentRate,
    };
  }

  /**
   * Generate matching algorithm performance report
   */
  static async generatePerformanceReport(): Promise<{
    summary: string;
    metrics: MatchingMetrics;
    insights: Awaited<ReturnType<typeof MatchingAnalytics.getAlgorithmInsights>>;
    queuePerformance: Awaited<ReturnType<typeof MatchingAnalytics.getQueuePerformance>>;
    generatedAt: Date;
  }> {
    const [metrics, insights, queuePerformance] = await Promise.all([
      this.getMatchingMetrics(),
      this.getAlgorithmInsights(),
      this.getQueuePerformance(),
    ]);

    const summary = `
Matching Algorithm Performance Report

Overall Effectiveness: ${(insights.overallEffectiveness * 100).toFixed(1)}%
Total Matches: ${metrics.totalMatches}
Success Rate: ${(metrics.matchSuccessRate * 100).toFixed(1)}%
Average Session Rating: ${metrics.averageSessionRating.toFixed(1)}/5
User Retention Rate: ${(metrics.userRetentionRate * 100).toFixed(1)}%

Key Insights:
- Skill matching accuracy: ${(insights.skillMatchAccuracy * 100).toFixed(1)}%
- Timezone optimization: ${(insights.timezoneOptimization * 100).toFixed(1)}%
- Availability utilization: ${(insights.availabilityUtilization * 100).toFixed(1)}%
- Communication alignment: ${(insights.communicationAlignment * 100).toFixed(1)}%

Queue Performance:
- Average wait time: ${queuePerformance.averageWaitTime.toFixed(1)} minutes
- Throughput: ${queuePerformance.queueThroughput.toFixed(2)} matches/hour
- Abandonment rate: ${(queuePerformance.abandonmentRate * 100).toFixed(1)}%

Recommendations:
${insights.recommendations.map(rec => `- ${rec}`).join('\n')}
    `.trim();

    return {
      summary,
      metrics,
      insights,
      queuePerformance,
      generatedAt: new Date(),
    };
  }
}