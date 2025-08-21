'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { usePerformance } from './PerformanceProvider';
import { useAccessibility } from './AccessibilityProvider';
import { useResponsive } from './ResponsiveProvider';

interface GlassGridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    mobile?: 1 | 2 | 3;
    tablet?: 1 | 2 | 3 | 4;
    desktop?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  animated?: boolean;
  staggerChildren?: boolean;
}

const GlassGrid = forwardRef<HTMLDivElement, GlassGridProps>(
  ({
    className,
    cols = 3,
    gap = 'md',
    responsive,
    animated = true,
    staggerChildren = false,
    children,
    ...props
  }, ref) => {
    const { enableAnimations } = usePerformance();
    const { reducedMotion } = useAccessibility();
    const { isMobile, isTablet, isDesktop } = useResponsive();

    const gaps = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8'
    };

    const getColumns = () => {
      if (responsive) {
        if (isMobile && responsive.mobile) return responsive.mobile;
        if (isTablet && responsive.tablet) return responsive.tablet;
        if (isDesktop && responsive.desktop) return responsive.desktop;
      }
      return cols;
    };

    const columns = getColumns();
    const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12'
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

    const gridContent = (
      <div
        ref={ref}
        className={cn(
          'grid',
          gridCols[columns as keyof typeof gridCols],
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
          {gridContent}
        </motion.div>
      );
    }

    return gridContent;
  }
);

GlassGrid.displayName = 'GlassGrid';

// Grid Item Component
interface GlassGridItemProps extends HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  offset?: 1 | 2 | 3 | 4 | 5 | 6;
  order?: number;
}

const GlassGridItem = forwardRef<HTMLDivElement, GlassGridItemProps>(
  ({
    className,
    span = 1,
    offset = 0,
    order,
    children,
    ...props
  }, ref) => {
    const spanClasses = {
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
      12: 'col-span-12'
    };

    const offsetClasses = {
      0: '',
      1: 'col-start-2',
      2: 'col-start-3',
      3: 'col-start-4',
      4: 'col-start-5',
      5: 'col-start-6',
      6: 'col-start-7'
    };

    return (
      <div
        ref={ref}
        className={cn(
          spanClasses[span as keyof typeof spanClasses],
          offsetClasses[offset as keyof typeof offsetClasses],
          className
        )}
        style={{ order }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassGridItem.displayName = 'GlassGridItem';

export { GlassGrid, GlassGridItem };