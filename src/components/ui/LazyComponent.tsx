import React, { Suspense, lazy } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import LoadingSkeleton from './LoadingSkeleton';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

export function LazyComponent({
  children,
  fallback = <LoadingSkeleton />,
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
}: LazyComponentProps) {
  const { elementRef, isVisible } = useIntersectionObserver({
    threshold,
    rootMargin,
    freezeOnceVisible: true,
  });

  return (
    <div ref={elementRef as React.RefObject<HTMLDivElement>} className={className}>
      {isVisible ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    threshold?: number;
    rootMargin?: string;
    fallback?: React.ReactNode;
  } = {}
) {
  const LazyWrappedComponent = (props: P) => {
    const { threshold = 0.1, rootMargin = '50px', fallback = <LoadingSkeleton /> } = options;

    return (
      <LazyComponent
        threshold={threshold}
        rootMargin={rootMargin}
        fallback={fallback}
      >
        <Component {...props} />
      </LazyComponent>
    );
  };

  LazyWrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;

  return LazyWrappedComponent;
}

// Utility for creating lazy-loaded route components
export function createLazyRoute(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(importFn);
}

export default LazyComponent;