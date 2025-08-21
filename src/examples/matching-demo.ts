/**
 * Demo script showing how the AI matching algorithm works
 * This file demonstrates the core functionality and can be used for testing
 */

import { MatchingService } from '@/services/matching.service';
import { MatchingAnalytics } from '@/lib/matching-analytics';
import {
  getCompatibilityDescription,
  getSkillLevelDescription,
  validateMatchingRequest
} from '@/lib/matching-config';
import type { MatchingRequest, UserProfile } from '@/types';

/**
 * Demo function showing matching algorithm in action
 */
export async function demonstrateMatching() {
  console.log('🤖 AI Matching Algorithm Demo\n');

  // Example matching request
  const matchingRequest: MatchingRequest = {
    userId: 'user-123',
    preferredSkills: ['JavaScript', 'React'],
    sessionType: 'learning',
    maxDuration: 60,
    urgency: 'medium',
  };

  // Validate the request
  const validation = validateMatchingRequest(matchingRequest);
  if (!validation.isValid) {
    console.error('❌ Invalid matching request:', validation.errors);
    return;
  }

  console.log('✅ Matching Request Validated');
  console.log(`👤 User: ${matchingRequest.userId}`);
  console.log(`🎯 Preferred Skills: ${matchingRequest.preferredSkills.join(', ')}`);
  console.log(`📚 Session Type: ${matchingRequest.sessionType}`);
  console.log(`⏱️  Max Duration: ${matchingRequest.maxDuration} minutes`);
  console.log(`🚨 Urgency: ${matchingRequest.urgency}\n`);

  try {
    // Add user to matching queue
    console.log('📋 Adding user to matching queue...');
    await MatchingService.addToQueue(matchingRequest);
    console.log('✅ User added to queue\n');

    // Attempt to find a match
    console.log('🔍 Searching for compatible matches...');
    const matchResult = await MatchingService.findMatch(matchingRequest);

    if (matchResult) {
      console.log('🎉 Match Found!\n');
      console.log(`👥 Partner ID: ${matchResult.partnerId}`);
      console.log(`💯 Compatibility Score: ${(matchResult.compatibilityScore * 100).toFixed(1)}%`);
      console.log(`📊 Match Quality: ${getCompatibilityDescription(matchResult.compatibilityScore)}`);
      console.log(`⚡ Processing Time: ${matchResult.estimatedWaitTime}ms\n`);

      // Show detailed score breakdown
      console.log('📈 Compatibility Breakdown:');
      console.log(`  🎯 Skill Compatibility: ${(matchResult.scoreBreakdown.skillCompatibility * 100).toFixed(1)}%`);
      console.log(`  🌍 Timezone Compatibility: ${(matchResult.scoreBreakdown.timezoneCompatibility * 100).toFixed(1)}%`);
      console.log(`  📅 Availability Compatibility: ${(matchResult.scoreBreakdown.availabilityCompatibility * 100).toFixed(1)}%`);
      console.log(`  💬 Communication Compatibility: ${(matchResult.scoreBreakdown.communicationCompatibility * 100).toFixed(1)}%`);
      console.log(`  📚 Session History Compatibility: ${(matchResult.scoreBreakdown.sessionHistoryCompatibility * 100).toFixed(1)}%\n`);

    } else {
      console.log('😔 No compatible matches found at this time');
      console.log('💡 Try adjusting your preferences or waiting for more users to join the queue\n');
    }

    // Show queue statistics
    console.log('📊 Current Queue Statistics:');
    const queueStats = await MatchingService.getQueueStats();
    console.log(`  👥 Total in Queue: ${queueStats.totalInQueue}`);
    console.log(`  ⏱️  Average Wait Time: ${queueStats.averageWaitTime.toFixed(1)} minutes`);
    console.log(`  📚 By Session Type:`, queueStats.bySessionType);
    console.log(`  🚨 By Urgency:`, queueStats.byUrgency);

  } catch (error) {
    console.error('❌ Error during matching process:', error);
  }
}

/**
 * Demo function showing skill compatibility calculation
 */
export function demonstrateSkillCompatibility() {
  console.log('\n🎯 Skill Compatibility Demo\n');

  const scenarios = [
    {
      name: 'Perfect Learning Match',
      requesterLevel: 2,
      partnerLevel: 4,
      sessionType: 'learning',
      description: 'Beginner learning from Advanced user'
    },
    {
      name: 'Ideal Collaboration',
      requesterLevel: 3,
      partnerLevel: 3,
      sessionType: 'collaboration',
      description: 'Two Intermediate users collaborating'
    },
    {
      name: 'Teaching Scenario',
      requesterLevel: 5,
      partnerLevel: 2,
      sessionType: 'teaching',
      description: 'Expert teaching Novice user'
    },
    {
      name: 'Challenging Gap',
      requesterLevel: 1,
      partnerLevel: 5,
      sessionType: 'learning',
      description: 'Beginner with Expert (large gap)'
    }
  ];

  scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   📝 ${scenario.description}`);
    console.log(`   👤 Requester: Level ${scenario.requesterLevel} (${getSkillLevelDescription(scenario.requesterLevel)})`);
    console.log(`   👥 Partner: Level ${scenario.partnerLevel} (${getSkillLevelDescription(scenario.partnerLevel)})`);
    console.log(`   📚 Session Type: ${scenario.sessionType}`);

    // Calculate compatibility (accessing private method for demo)
    const compatibility = (MatchingService as any).calculateSkillComplementarity(
      scenario.requesterLevel,
      scenario.partnerLevel,
      scenario.sessionType
    );

    console.log(`   💯 Compatibility: ${(compatibility * 100).toFixed(1)}% (${getCompatibilityDescription(compatibility)})\n`);
  });
}

/**
 * Demo function showing timezone compatibility
 */
export function demonstrateTimezoneCompatibility() {
  console.log('\n🌍 Timezone Compatibility Demo\n');

  const timezoneTests = [
    { tz1: 'America/New_York', tz2: 'America/New_York', desc: 'Same timezone' },
    { tz1: 'America/New_York', tz2: 'America/Toronto', desc: 'Very close timezones' },
    { tz1: 'America/New_York', tz2: 'Europe/London', desc: 'Moderate difference' },
    { tz1: 'America/New_York', tz2: 'Asia/Tokyo', desc: 'Large difference' },
    { tz1: 'Europe/London', tz2: 'Australia/Sydney', desc: 'Opposite sides of world' },
  ];

  timezoneTests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.desc}`);
    console.log(`   🌍 Timezone 1: ${test.tz1}`);
    console.log(`   🌍 Timezone 2: ${test.tz2}`);

    const compatibility = (MatchingService as any).calculateTimezoneCompatibility(test.tz1, test.tz2);
    console.log(`   💯 Compatibility: ${(compatibility * 100).toFixed(1)}%\n`);
  });
}

/**
 * Demo function showing analytics capabilities
 */
export async function demonstrateAnalytics() {
  console.log('\n📊 Matching Analytics Demo\n');

  try {
    // Get current metrics
    console.log('📈 Current Platform Metrics:');
    const metrics = await MatchingAnalytics.getMatchingMetrics();
    console.log(`  🎯 Total Matches: ${metrics.totalMatches}`);
    console.log(`  ✅ Successful Matches: ${metrics.successfulMatches}`);
    console.log(`  📊 Success Rate: ${(metrics.matchSuccessRate * 100).toFixed(1)}%`);
    console.log(`  ⭐ Average Session Rating: ${metrics.averageSessionRating.toFixed(1)}/5`);
    console.log(`  🔄 User Retention Rate: ${(metrics.userRetentionRate * 100).toFixed(1)}%\n`);

    // Get algorithm insights
    console.log('🧠 Algorithm Performance Insights:');
    const insights = await MatchingAnalytics.getAlgorithmInsights();
    console.log(`  🎯 Skill Match Accuracy: ${(insights.skillMatchAccuracy * 100).toFixed(1)}%`);
    console.log(`  🌍 Timezone Optimization: ${(insights.timezoneOptimization * 100).toFixed(1)}%`);
    console.log(`  📅 Availability Utilization: ${(insights.availabilityUtilization * 100).toFixed(1)}%`);
    console.log(`  💬 Communication Alignment: ${(insights.communicationAlignment * 100).toFixed(1)}%`);
    console.log(`  🏆 Overall Effectiveness: ${(insights.overallEffectiveness * 100).toFixed(1)}%\n`);

    console.log('💡 Recommendations:');
    insights.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
  }
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log('🚀 SkillSync AI Matching Algorithm - Complete Demo\n');
  console.log('=' .repeat(60));

  await demonstrateMatching();

  console.log('\n' + '=' .repeat(60));
  demonstrateSkillCompatibility();

  console.log('=' .repeat(60));
  demonstrateTimezoneCompatibility();

  console.log('=' .repeat(60));
  await demonstrateAnalytics();

  console.log('\n🎉 Demo completed! The AI matching algorithm is ready for production use.');
}

// Export for use in other files
export default {
  demonstrateMatching,
  demonstrateSkillCompatibility,
  demonstrateTimezoneCompatibility,
  demonstrateAnalytics,
  runAllDemos,
};