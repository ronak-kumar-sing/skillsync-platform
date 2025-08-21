'use client';

import { HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface GlassProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  animated?: boolean;
  label?: string;
}

const GlassProgress = ({
  className,
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showValue = false,
  animated = true,
  label,
  ...props
}: GlassProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const variants = {
    default: 'bg-white/30',
    primary: 'bg-primary-500/60',
    secondary: 'bg-secondary-500/60',
    accent: 'bg-accent-500/60',
    success: 'bg-green-500/60',
    warning: 'bg-yellow-500/60',
    error: 'bg-red-500/60'
  };

  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-sm font-medium text-white/80">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm text-white/60">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div className={cn(
        'w-full bg-white/10 backdrop-blur-sm rounded-full border border-white/20 overflow-hidden',
        sizes[size]
      )}>
        <motion.div
          className={cn(
            'h-full rounded-full backdrop-blur-sm',
            variants[variant]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={animated ? { duration: 0.8, ease: 'easeOut' } : { duration: 0 }}
        />
      </div>
    </div>
  );
};

// Circular Progress Component
interface GlassCircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

const GlassCircularProgress = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'primary',
  showValue = true,
  animated = true,
  className
}: GlassCircularProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const variants = {
    default: 'stroke-white/60',
    primary: 'stroke-primary-400',
    secondary: 'stroke-secondary-400',
    accent: 'stroke-accent-400',
    success: 'stroke-green-400',
    warning: 'stroke-yellow-400',
    error: 'stroke-red-400'
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
          className="backdrop-blur-sm"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={cn('backdrop-blur-sm', variants[variant])}
          initial={{ strokeDasharray, strokeDashoffset: circumference }}
          animate={{ strokeDasharray, strokeDashoffset }}
          transition={animated ? { duration: 1, ease: 'easeOut' } : { duration: 0 }}
        />
      </svg>

      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-white">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

export { GlassProgress, GlassCircularProgress };