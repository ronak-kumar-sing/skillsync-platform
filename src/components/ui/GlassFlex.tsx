'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { usePerformance } from './PerformanceProvider';
import { useAccessibility } from './AccessibilityProvider';

interface GlassFlexProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  staggerChildren?: boolean;
}

const GlassFlex = forwardRef<HTMLDivElement, GlassFlexProps>(
  ({
    className,
    direction = 'row',
    wrap = 'nowrap',
    justify = 'start',
    align = 'start',
    gap = 'md',
    animated = false,
    staggerChildren = false,
    children,
    ...props
  }, ref) => {
    const { enableAnimations } = usePerformance();
    const { reducedMotion } = useAccessibility();

    const directions = {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse'
    };

    const wraps = {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
      'wrap-reverse': 'flex-wrap-reverse'
    };

    const justifies = {
      start: 'justify-start',
      end: 'justify-end',
      center: 'justify-center',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly'
    };

    const aligns = {
      start: 'items-start',
      end: 'items-end',
      center: 'items-center',
      baseline: 'items-baseline',
      stretch: 'items-stretch'
    };

    const gaps = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8'
    };

    const shouldAnimate = animated && enableAnimations && !reducedMotion;

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerChildren ? 0.1 : 0,
          delayChildren: 0.1
        }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' }
      }
    };

    const flexContent = (
      <div
        ref={ref}
        className={cn(
          'flex',
          directions[direction],
          wraps[wrap],
          justifies[justify],
          aligns[align],
          gaps[gap],
          className
        )}
        {...props}
      >
        {shouldAnimate && staggerChildren
          ? Array.isArray(children)
            ? children.map((child, index) => (
              <motion.div key={index} variants={itemVariants}>
                {child}
              </motion.div>
            ))
            : <motion.div variants={itemVariants}>{children}</motion.div>
          : children
        }
      </div>
    );

    if (shouldAnimate && staggerChildren) {
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {flexContent}
        </motion.div>
      );
    }

    if (shouldAnimate) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {flexContent}
        </motion.div>
      );
    }

    return flexContent;
  }
);

GlassFlex.displayName = 'GlassFlex';

// Flex Item Component
interface GlassFlexItemProps extends HTMLAttributes<HTMLDivElement> {
  flex?: 'none' | 'auto' | 'initial' | '1' | number;
  grow?: boolean | number;
  shrink?: boolean | number;
  basis?: string | number;
  order?: number;
}

const GlassFlexItem = forwardRef<HTMLDivElement, GlassFlexItemProps>(
  ({
    className,
    flex,
    grow,
    shrink,
    basis,
    order,
    children,
    ...props
  }, ref) => {
    const getFlexClass = () => {
      if (flex === 'none') return 'flex-none';
      if (flex === 'auto') return 'flex-auto';
      if (flex === 'initial') return 'flex-initial';
      if (flex === '1') return 'flex-1';
      return '';
    };

    const getGrowClass = () => {
      if (grow === true) return 'flex-grow';
      if (grow === false) return 'flex-grow-0';
      if (typeof grow === 'number') return `flex-grow-${grow}`;
      return '';
    };

    const getShrinkClass = () => {
      if (shrink === true) return 'flex-shrink';
      if (shrink === false) return 'flex-shrink-0';
      if (typeof shrink === 'number') return `flex-shrink-${shrink}`;
      return '';
    };

    const style = {
      flexBasis: basis,
      order
    };

    return (
      <div
        ref={ref}
        className={cn(
          getFlexClass(),
          getGrowClass(),
          getShrinkClass(),
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassFlexItem.displayName = 'GlassFlexItem';

export { GlassFlex, GlassFlexItem };