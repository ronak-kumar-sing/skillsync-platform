'use client';

import { cn } from '@/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  animation?: 'pulse' | 'wave' | 'none';
  lines?: number;
  width?: string | number;
  height?: string | number;
}

const LoadingSkeleton = ({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  lines = 1,
  width,
  height
}: LoadingSkeletonProps) => {
  const baseClasses = 'bg-white/10 backdrop-blur-sm border border-white/5 relative overflow-hidden';

  const animations = {
    pulse: 'animate-pulse',
    wave: 'shimmer',
    none: ''
  };

  const variants = {
    text: 'h-4 rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-2xl'
  };

  const style = {
    width: width || (variant === 'circular' ? height : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined)
  };

  const skeletonElement = (index?: number) => (
    <div
      key={index}
      className={cn(
        baseClasses,
        variants[variant === 'text' ? 'text' : variant],
        animations[animation],
        variant === 'text' && lines > 1 && index === lines - 1 && 'w-3/4', // Last line is shorter
        className
      )}
      style={style}
    >
      {/* Shimmer overlay for wave animation */}
      {animation === 'wave' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
      )}
    </div>
  );

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => skeletonElement(index))}
      </div>
    );
  }

  return skeletonElement();
};

// Predefined skeleton components for common use cases
const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('p-6 space-y-4', className)}>
    <LoadingSkeleton variant="rectangular" height="200px" />
    <LoadingSkeleton variant="text" lines={3} />
    <div className="flex items-center space-x-3">
      <LoadingSkeleton variant="circular" width="40px" height="40px" />
      <div className="flex-1">
        <LoadingSkeleton variant="text" lines={2} />
      </div>
    </div>
  </div>
);

const SkeletonList = ({
  items = 5,
  className
}: {
  items?: number;
  className?: string;
}) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4">
        <LoadingSkeleton variant="circular" width="48px" height="48px" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton variant="text" width="60%" />
          <LoadingSkeleton variant="text" width="40%" />
        </div>
        <LoadingSkeleton variant="rectangular" width="80px" height="32px" />
      </div>
    ))}
  </div>
);

const SkeletonProfile = ({ className }: { className?: string }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header */}
    <div className="flex items-center space-x-6">
      <LoadingSkeleton variant="circular" width="120px" height="120px" />
      <div className="flex-1 space-y-3">
        <LoadingSkeleton variant="text" width="200px" height="32px" />
        <LoadingSkeleton variant="text" lines={2} />
        <div className="flex space-x-2">
          <LoadingSkeleton variant="rectangular" width="80px" height="24px" />
          <LoadingSkeleton variant="rectangular" width="80px" height="24px" />
          <LoadingSkeleton variant="rectangular" width="80px" height="24px" />
        </div>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="p-4 space-y-2">
          <LoadingSkeleton variant="text" width="60%" />
          <LoadingSkeleton variant="text" width="40%" height="24px" />
        </div>
      ))}
    </div>

    {/* Content sections */}
    <div className="space-y-4">
      <LoadingSkeleton variant="text" width="150px" height="24px" />
      <LoadingSkeleton variant="rectangular" height="200px" />
    </div>
  </div>
);

const SkeletonDashboard = ({ className }: { className?: string }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header */}
    <div className="flex items-center justify-between">
      <LoadingSkeleton variant="text" width="200px" height="32px" />
      <LoadingSkeleton variant="rectangular" width="120px" height="40px" />
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <LoadingSkeleton variant="circular" width="40px" height="40px" />
            <LoadingSkeleton variant="text" width="60px" />
          </div>
          <LoadingSkeleton variant="text" width="80%" height="24px" />
          <LoadingSkeleton variant="text" width="60%" />
        </div>
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <LoadingSkeleton variant="text" width="150px" height="24px" />
        <LoadingSkeleton variant="rectangular" height="300px" />
      </div>
      <div className="space-y-4">
        <LoadingSkeleton variant="text" width="150px" height="24px" />
        <LoadingSkeleton variant="rectangular" height="300px" />
      </div>
    </div>

    {/* Recent Activity */}
    <div className="space-y-4">
      <LoadingSkeleton variant="text" width="150px" height="24px" />
      <SkeletonList items={3} />
    </div>
  </div>
);

export {
  LoadingSkeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonProfile,
  SkeletonDashboard
};