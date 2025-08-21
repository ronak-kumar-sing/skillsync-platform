import { UserAchievement } from '@/types';

export interface AchievementNotification {
  id: string;
  achievement: {
    id: string;
    name: string;
    description: string;
    iconUrl?: string;
    category: string;
    points: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
  earnedAt: Date;
  isNew: boolean;
  showAnimation: boolean;
}

export interface NotificationQueue {
  notifications: AchievementNotification[];
  currentIndex: number;
  isPlaying: boolean;
}

export class AchievementNotificationService {
  private static instance: AchievementNotificationService;
  private notificationQueue: NotificationQueue = {
    notifications: [],
    currentIndex: 0,
    isPlaying: false
  };
  private listeners: Array<(notification: AchievementNotification) => void> = [];
  private queueListeners: Array<(queue: NotificationQueue) => void> = [];

  static getInstance(): AchievementNotificationService {
    if (!AchievementNotificationService.instance) {
      AchievementNotificationService.instance = new AchievementNotificationService();
    }
    return AchievementNotificationService.instance;
  }

  /**
   * Add new achievements to the notification queue
   */
  addAchievements(userAchievements: UserAchievement[]): void {
    const notifications: AchievementNotification[] = userAchievements.map(ua => ({
      id: `${ua.id}-${Date.now()}`,
      achievement: {
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        iconUrl: ua.achievement.iconUrl || undefined,
        category: ua.achievement.category,
        points: ua.achievement.points,
        rarity: ua.achievement.rarity
      },
      earnedAt: ua.earnedAt,
      isNew: true,
      showAnimation: true
    }));

    this.notificationQueue.notifications.push(...notifications);
    this.notifyQueueListeners();

    // Auto-play if not already playing
    if (!this.notificationQueue.isPlaying && notifications.length > 0) {
      this.playNext();
    }
  }

  /**
   * Play the next notification in the queue
   */
  playNext(): void {
    if (this.notificationQueue.currentIndex >= this.notificationQueue.notifications.length) {
      this.notificationQueue.isPlaying = false;
      this.notificationQueue.currentIndex = 0;
      this.notifyQueueListeners();
      return;
    }

    this.notificationQueue.isPlaying = true;
    const notification = this.notificationQueue.notifications[this.notificationQueue.currentIndex];

    // Notify listeners
    this.listeners.forEach(listener => listener(notification));
    this.notifyQueueListeners();

    // Auto-advance after animation duration
    const animationDuration = this.getAnimationDuration(notification.achievement.rarity);
    setTimeout(() => {
      this.notificationQueue.currentIndex++;
      this.playNext();
    }, animationDuration);
  }

  /**
   * Skip current notification
   */
  skipCurrent(): void {
    if (this.notificationQueue.isPlaying) {
      this.notificationQueue.currentIndex++;
      this.playNext();
    }
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notificationQueue = {
      notifications: [],
      currentIndex: 0,
      isPlaying: false
    };
    this.notifyQueueListeners();
  }

  /**
   * Get animation duration based on rarity
   */
  private getAnimationDuration(rarity: string): number {
    switch (rarity) {
      case 'legendary': return 6000; // 6 seconds
      case 'epic': return 5000;      // 5 seconds
      case 'rare': return 4000;      // 4 seconds
      default: return 3000;          // 3 seconds
    }
  }

  /**
   * Subscribe to achievement notifications
   */
  subscribe(listener: (notification: AchievementNotification) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to queue updates
   */
  subscribeToQueue(listener: (queue: NotificationQueue) => void): () => void {
    this.queueListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.queueListeners.indexOf(listener);
      if (index > -1) {
        this.queueListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current queue state
   */
  getQueue(): NotificationQueue {
    return { ...this.notificationQueue };
  }

  /**
   * Notify queue listeners
   */
  private notifyQueueListeners(): void {
    this.queueListeners.forEach(listener => listener(this.getQueue()));
  }

  /**
   * Create a test notification (for development/testing)
   */
  createTestNotification(rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common'): void {
    const testAchievement: UserAchievement = {
      id: `test-${Date.now()}`,
      achievementId: 'test-achievement',
      achievement: {
        id: 'test-achievement',
        name: 'Test Achievement',
        description: 'This is a test achievement for development purposes',
        iconUrl: undefined,
        category: 'testing',
        points: rarity === 'legendary' ? 1000 : rarity === 'epic' ? 500 : rarity === 'rare' ? 250 : 100,
        rarity,
        criteria: {},
        createdAt: new Date()
      },
      earnedAt: new Date(),
      progress: undefined
    };

    this.addAchievements([testAchievement]);
  }

  /**
   * Get rarity-specific styling
   */
  static getRarityStyles(rarity: string): {
    gradient: string;
    glow: string;
    textColor: string;
    borderColor: string;
  } {
    switch (rarity) {
      case 'legendary':
        return {
          gradient: 'from-yellow-400 via-orange-500 to-red-500',
          glow: 'shadow-2xl shadow-yellow-500/50',
          textColor: 'text-yellow-300',
          borderColor: 'border-yellow-400'
        };
      case 'epic':
        return {
          gradient: 'from-purple-400 via-pink-500 to-purple-600',
          glow: 'shadow-2xl shadow-purple-500/50',
          textColor: 'text-purple-300',
          borderColor: 'border-purple-400'
        };
      case 'rare':
        return {
          gradient: 'from-blue-400 via-indigo-500 to-blue-600',
          glow: 'shadow-xl shadow-blue-500/40',
          textColor: 'text-blue-300',
          borderColor: 'border-blue-400'
        };
      default:
        return {
          gradient: 'from-gray-400 via-gray-500 to-gray-600',
          glow: 'shadow-lg shadow-gray-500/30',
          textColor: 'text-gray-300',
          borderColor: 'border-gray-400'
        };
    }
  }

  /**
   * Get rarity-specific animation settings
   */
  static getRarityAnimation(rarity: string): {
    scale: number;
    duration: number;
    particles: boolean;
    sound: boolean;
  } {
    switch (rarity) {
      case 'legendary':
        return {
          scale: 1.3,
          duration: 6000,
          particles: true,
          sound: true
        };
      case 'epic':
        return {
          scale: 1.2,
          duration: 5000,
          particles: true,
          sound: true
        };
      case 'rare':
        return {
          scale: 1.1,
          duration: 4000,
          particles: false,
          sound: true
        };
      default:
        return {
          scale: 1.0,
          duration: 3000,
          particles: false,
          sound: false
        };
    }
  }
}

// Export singleton instance
export const achievementNotificationService = AchievementNotificationService.getInstance();