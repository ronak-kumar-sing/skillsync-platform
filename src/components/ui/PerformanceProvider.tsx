'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

interface PerformanceContextType {
  isLowPerformance: boolean;
  connectionSpeed: 'slow' | 'fast' | 'unknown';
  enableAnimations: boolean;
  enableBlur: boolean;
  enableShadows: boolean;
  optimizeImages: boolean;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

interface PerformanceProviderProps {
  children: ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown');

  useEffect(() => {
    // Check device performance indicators
    const checkPerformance = () => {
      let performanceScore = 0;

      // Check hardware concurrency (CPU cores)
      if (navigator.hardwareConcurrency) {
        performanceScore += navigator.hardwareConcurrency >= 4 ? 2 : 1;
      }

      // Check memory (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        if (memory.jsHeapSizeLimit) {
          performanceScore += memory.jsHeapSizeLimit > 1073741824 ? 2 : 1; // > 1GB
        }
      }

      // Check connection speed
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const effectiveType = connection.effectiveType;
          if (effectiveType === '4g') {
            setConnectionSpeed('fast');
            performanceScore += 2;
          } else if (effectiveType === '3g') {
            setConnectionSpeed('fast');
            performanceScore += 1;
          } else {
            setConnectionSpeed('slow');
          }
        }
      }

      // Check if device prefers reduced motion
      if (typeof window !== 'undefined' && window.matchMedia) {
        try {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            performanceScore -= 1;
          }
        } catch (error) {
          // Fallback if matchMedia is not available
          console.warn('matchMedia not available:', error);
        }
      }

      // Determine if device is low performance
      setIsLowPerformance(performanceScore < 3);
    };

    checkPerformance();

    // Monitor performance over time
    const performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const longTasks = entries.filter(entry => entry.duration > 50);

      if (longTasks.length > 5) {
        setIsLowPerformance(true);
      }
    });

    if ('PerformanceObserver' in window) {
      try {
        performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task API not supported
      }
    }

    return () => {
      performanceObserver.disconnect();
    };
  }, []);

  // Derive optimization settings based on performance
  const enableAnimations = !isLowPerformance && connectionSpeed !== 'slow';
  const enableBlur = !isLowPerformance;
  const enableShadows = !isLowPerformance;
  const optimizeImages = isLowPerformance || connectionSpeed === 'slow';

  return (
    <PerformanceContext.Provider value={{
      isLowPerformance,
      connectionSpeed,
      enableAnimations,
      enableBlur,
      enableShadows,
      optimizeImages
    }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

// Hook for lazy loading images
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const { optimizeImages } = usePerformance();

  const imageRef = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };

    // Use optimized version if needed
    if (optimizeImages && src.includes('http')) {
      // Add image optimization parameters (example for services like Cloudinary)
      const optimizedSrc = src.includes('?')
        ? `${src}&q_auto,f_auto,w_800`
        : `${src}?q_auto,f_auto,w_800`;
      img.src = optimizedSrc;
    } else {
      img.src = src;
    }
  }, [isInView, src, optimizeImages]);

  return { imageSrc, isLoaded, imageRef };
};

// Hook for performance-aware animations
export const usePerformantAnimation = (animation: any) => {
  const { enableAnimations } = usePerformance();

  if (!enableAnimations) {
    return {
      ...animation,
      transition: { duration: 0 },
      animate: animation.initial || {}
    };
  }

  return animation;
};

// Component for performance-aware rendering
interface PerformantProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const Performant = ({
  children,
  fallback
}: PerformantProps) => {
  const { isLowPerformance } = usePerformance();

  if (isLowPerformance && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};