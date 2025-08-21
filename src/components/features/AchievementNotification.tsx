'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AchievementNotification as AchievementNotificationType,
  AchievementNotificationService,
  achievementNotificationService
} from '@/services/achievement-notification.service';

interface AchievementNotificationProps {
  className?: string;
}

export function AchievementNotification({ className = '' }: AchievementNotificationProps) {
  const [currentNotification, setCurrentNotification] = useState<AchievementNotificationType | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to achievement notifications
    const unsubscribe = achievementNotificationService.subscribe((notification) => {
      setCurrentNotification(notification);
      setIsVisible(true);

      // Auto-hide after animation duration
      const duration = AchievementNotificationService.getRarityAnimation(notification.achievement.rarity).duration;
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setCurrentNotification(null), 500); // Wait for exit animation
      }, duration - 500);
    });

    return unsubscribe;
  }, []);

  if (!currentNotification) {
    return null;
  }

  const styles = AchievementNotificationService.getRarityStyles(currentNotification.achievement.rarity);
  const animation = AchievementNotificationService.getRarityAnimation(currentNotification.achievement.rarity);

  return (
    <div className={`fixed inset-0 z-50 pointer-events-none ${className}`}>
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Achievement notification */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{
                  scale: 0,
                  opacity: 0,
                  rotateY: -180
                }}
                animate={{
                  scale: animation.scale,
                  opacity: 1,
                  rotateY: 0
                }}
                exit={{
                  scale: 0,
                  opacity: 0,
                  rotateY: 180
                }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  duration: 0.8
                }}
                className={`
                  relative max-w-md w-full mx-auto
                  bg-gradient-to-br ${styles.gradient}
                  ${styles.glow}
                  rounded-2xl p-6 text-center
                  border-2 ${styles.borderColor}
                  pointer-events-auto
                `}
              >
                {/* Particles effect for rare achievements */}
                {animation.particles && (
                  <div className="absolute inset-0 overflow-hidden rounded-2xl">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{
                          opacity: 0,
                          scale: 0,
                          x: Math.random() * 100 - 50,
                          y: Math.random() * 100 - 50
                        }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0],
                          x: Math.random() * 200 - 100,
                          y: Math.random() * 200 - 100
                        }}
                        transition={{
                          duration: 2,
                          delay: Math.random() * 2,
                          repeat: Infinity,
                          repeatDelay: Math.random() * 3
                        }}
                        className="absolute w-2 h-2 bg-white rounded-full"
                        style={{
                          left: '50%',
                          top: '50%'
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Achievement icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="relative mb-4"
                >
                  <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    {currentNotification.achievement.iconUrl ? (
                      <img
                        src={currentNotification.achievement.iconUrl}
                        alt={currentNotification.achievement.name}
                        className="w-12 h-12"
                      />
                    ) : (
                      <svg
                        className="w-12 h-12 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Pulsing ring animation */}
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 border-2 border-white rounded-full"
                  />
                </motion.div>

                {/* Achievement unlocked text */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-2"
                >
                  <div className="text-white/80 text-sm font-medium uppercase tracking-wider">
                    Achievement Unlocked!
                  </div>
                </motion.div>

                {/* Achievement name */}
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-2xl font-bold text-white mb-2"
                >
                  {currentNotification.achievement.name}
                </motion.h3>

                {/* Achievement description */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="text-white/90 text-sm mb-4"
                >
                  {currentNotification.achievement.description}
                </motion.p>

                {/* Points and rarity */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 }}
                  className="flex items-center justify-center space-x-4"
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-yellow-300 font-bold">
                      +{currentNotification.achievement.points}
                    </span>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${styles.textColor} bg-white/20`}>
                    {currentNotification.achievement.rarity}
                  </div>
                </motion.div>

                {/* Skip button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  onClick={() => {
                    setIsVisible(false);
                    achievementNotificationService.skipCurrent();
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white/70 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook for triggering test notifications (development only)
export function useTestAchievements() {
  const triggerTest = (rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common') => {
    if (process.env.NODE_ENV === 'development') {
      achievementNotificationService.createTestNotification(rarity);
    }
  };

  return { triggerTest };
}