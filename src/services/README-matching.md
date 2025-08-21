# AI Matching Algorithm

The SkillSync AI Matching Algorithm is a sophisticated multi-factor compatibility scoring system that intelligently pairs users for optimal learning sessions.

## Overview

The matching algorithm uses a weighted scoring system that evaluates five key compatibility factors:

- **Skill Compatibility (30%)** - Analyzes skill levels and complementarity
- **Session History Compatibility (25%)** - Considers past performance and ratings
- **Timezone Compatibility (15%)** - Optimizes for scheduling convenience
- **Availability Compatibility (15%)** - Matches overlapping time slots
- **Communication Compatibility (15%)** - Aligns communication preferences

## Core Features

### 🎯 Multi-Factor Scoring
- Weighted algorithm ensures balanced evaluation across all compatibility dimensions
- Configurable thresholds prevent poor matches from being suggested
- Real-time scoring adapts to user behavior and feedback

### 🧠 Intelligent Skill Matching
- **Learning Sessions**: Pairs learners with users 1-2 skill levels higher
- **Teaching Sessions**: Matches teachers with learners at appropriate skill gaps
- **Collaboration**: Finds users with similar or complementary skill levels
- Considers skill verification and endorsement levels

### 🌍 Timezone Optimization
- Calculates time differences between users
- Prioritizes matches within reasonable scheduling windows
- Handles timezone edge cases and daylight saving transitions

### 📅 Availability Matching
- Analyzes weekly availability schedules
- Calculates time slot overlaps with precision
- Boosts scores for users with significant availability overlap

### 💬 Communication Alignment
- Matches communication styles (formal, casual, balanced)
- Ensures common language compatibility
- Considers session duration preferences

### 📊 Session History Analysis
- Leverages past session ratings and feedback
- Identifies successful pairing patterns
- Improves recommendations based on user behavior

## Usage

### Basic Matching Request

```typescript
import { MatchingService } from '@/services/matching.service';

const request = {
  userId: 'user-123',
  preferredSkills: ['JavaScript', 'React'],
  sessionType: 'learning',
  maxDuration: 60,
  urgency: 'medium'
};

// Add user to matching queue
await MatchingService.addToQueue(request);

// Find a match
const match = await MatchingService.findMatch(request);

if (match) {
  console.log(`Found match: ${match.partnerId}`);
  console.log(`Compatibility: ${match.compatibilityScore * 100}%`);
}
```

### Queue Management

```typescript
// Get queue statistics
const stats = await MatchingService.getQueueStats();
console.log(`Users in queue: ${stats.totalInQueue}`);

// Remove user from queue
await MatchingService.removeFromQueue('user-123');

// Clean up expired entries
await MatchingService.cleanupExpiredQueue();
```

### Analytics and Monitoring

```typescript
import { MatchingAnalytics } from '@/lib/matching-analytics';

// Get platform metrics
const metrics = await MatchingAnalytics.getMatchingMetrics();

// Get algorithm performance insights
const insights = await MatchingAnalytics.getAlgorithmInsights();

// Generate comprehensive report
const report = await MatchingAnalytics.generatePerformanceReport();
```

## Configuration

### Matching Weights

The algorithm uses configurable weights defined in `@/lib/matching-config.ts`:

```typescript
export const MATCHING_WEIGHTS = {
  SKILL_COMPATIBILITY: 0.30,      // 30%
  TIMEZONE_COMPATIBILITY: 0.15,   // 15%
  AVAILABILITY_COMPATIBILITY: 0.15, // 15%
  COMMUNICATION_COMPATIBILITY: 0.15, // 15%
  SESSION_HISTORY_COMPATIBILITY: 0.25, // 25%
};
```

### Quality Thresholds

Minimum compatibility scores required for matching:

```typescript
export const MATCHING_THRESHOLDS = {
  MINIMUM_TOTAL_SCORE: 0.4,      // 40% overall compatibility
  MINIMUM_SKILL_SCORE: 0.2,      // 20% skill compatibility
  MINIMUM_AVAILABILITY_SCORE: 0.1, // 10% availability overlap
};
```

### Queue Settings

Queue expiration times based on urgency:

```typescript
export const QUEUE_EXPIRATION = {
  HIGH_URGENCY: 15,    // 15 minutes
  MEDIUM_URGENCY: 30,  // 30 minutes
  LOW_URGENCY: 60,     // 60 minutes
};
```

## Algorithm Details

### Skill Compatibility Calculation

The skill compatibility algorithm considers:

1. **Skill Level Gap**: Optimal gaps vary by session type
   - Learning: 1-2 levels higher partner preferred
   - Teaching: 1-2 levels lower partner preferred
   - Collaboration: Same or ±1 level preferred

2. **Preferred Skills**: Double weight for user-specified skills

3. **Skill Verification**: Bonus for verified skills and endorsements

### Timezone Compatibility Scoring

- **Same timezone**: 100% compatibility
- **0-2 hours difference**: 90% compatibility
- **2-4 hours difference**: 70% compatibility
- **4-6 hours difference**: 50% compatibility
- **6-8 hours difference**: 30% compatibility
- **8+ hours difference**: 10% compatibility

### Availability Overlap Calculation

1. Analyzes weekly schedules for both users
2. Calculates minute-by-minute overlap for each day
3. Computes total overlap as percentage of available time
4. Applies bonus multiplier for any overlap found

### Communication Compatibility Factors

- **Style Matching**: Perfect match for same style, good match with "balanced"
- **Language Overlap**: Requires at least one common language
- **Duration Alignment**: Penalizes large differences in preferred session length

### Session History Integration

- **Previous Partners**: Uses actual session ratings if available
- **Individual Stats**: Considers average ratings, experience level, activity
- **Pattern Recognition**: Identifies successful pairing characteristics

## Performance Monitoring

### Key Metrics Tracked

- **Match Success Rate**: Percentage of queue entries that result in matches
- **Compatibility Accuracy**: Correlation between predicted and actual session success
- **Queue Performance**: Average wait times and throughput
- **User Satisfaction**: Session ratings and retention rates

### Analytics Dashboard

The system provides comprehensive analytics including:

- Real-time queue statistics
- Algorithm performance insights
- User behavior patterns
- Optimization recommendations

## Testing

The matching algorithm includes comprehensive unit tests covering:

- Skill compatibility calculations
- Timezone handling
- Availability overlap logic
- Communication matching
- Edge cases and error handling

Run tests with:
```bash
npm test src/services/__tests__/matching.service.test.ts
```

## Demo and Examples

See `src/examples/matching-demo.ts` for interactive demonstrations of:

- Complete matching workflow
- Skill compatibility scenarios
- Timezone compatibility examples
- Analytics capabilities

## Future Enhancements

### Planned Improvements

1. **Machine Learning Integration**
   - Learn from successful session patterns
   - Adaptive weight adjustment based on outcomes
   - Personalized compatibility scoring

2. **Advanced Scheduling**
   - Calendar integration
   - Automatic session scheduling
   - Recurring session matching

3. **Enhanced Analytics**
   - Predictive wait time estimation
   - A/B testing framework for algorithm improvements
   - Real-time performance monitoring

4. **Social Features**
   - Friend/mentor preferences
   - Group session matching
   - Community-based recommendations

### Performance Optimizations

- Caching for frequently accessed user profiles
- Batch processing for queue operations
- Database indexing optimization
- Asynchronous matching pipeline

## Contributing

When modifying the matching algorithm:

1. Update relevant unit tests
2. Validate weight totals equal 100%
3. Test with diverse user scenarios
4. Monitor performance impact
5. Update documentation

## Support

For questions about the matching algorithm:

- Review the test cases for usage examples
- Check the demo file for interactive examples
- Consult the analytics for performance insights
- Refer to the configuration file for customization options