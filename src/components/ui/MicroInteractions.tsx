'use client';

import { motion, useAnimation, useInView } from 'framer-motion';
import { useRef, useEffect, useState, ReactNode } from 'react';

// Hover Scale Animation
interface HoverScaleProps {
  children: ReactNode;
  scale?: number;
  duration?: number;
  className?: string;
}

export const HoverScale = ({
  children,
  scale = 1.05,
  duration = 0.2,
  className = ''
}: HoverScaleProps) => (
  <motion.div
    whileHover={{ scale }}
    whileTap={{ scale: scale * 0.95 }}
    transition={{ duration }}
    className={className}
  >
    {children}
  </motion.div>
);

// Magnetic Button Effect
interface MagneticButtonProps {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export const MagneticButton = ({
  children,
  strength = 0.3,
  className = ''
}: MagneticButtonProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    ref.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate(0px, 0px)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
};

// Ripple Effect
interface RippleEffectProps {
  children: ReactNode;
  color?: string;
  duration?: number;
  className?: string;
}

export const RippleEffect = ({
  children,
  color = 'rgba(255, 255, 255, 0.3)',
  duration = 600,
  className = ''
}: RippleEffectProps) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: ${color};
      transform: scale(0);
      animation: ripple ${duration}ms linear;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      pointer-events: none;
    `;

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, duration);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      style={{
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {children}
      <style jsx>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Floating Animation
interface FloatingProps {
  children: ReactNode;
  duration?: number;
  intensity?: number;
  className?: string;
}

export const Floating = ({
  children,
  duration = 3,
  intensity = 10,
  className = ''
}: FloatingProps) => (
  <motion.div
    animate={{
      y: [-intensity, intensity, -intensity],
      rotate: [-1, 1, -1]
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Parallax Scroll Effect
interface ParallaxScrollProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export const ParallaxScroll = ({
  children,
  speed = 0.5,
  className = ''
}: ParallaxScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const isInView = useInView(ref, { once: false });

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.pageYOffset;
      const rate = scrolled * speed;

      controls.start({
        y: rate,
        transition: { duration: 0 }
      });
    };

    if (isInView) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isInView, speed, controls]);

  return (
    <motion.div
      ref={ref}
      animate={controls}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Stagger Animation Container
interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggerContainer = ({
  children,
  staggerDelay = 0.1,
  className = ''
}: StaggerContainerProps) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay
        }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Stagger Item
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export const StaggerItem = ({ children, className = '' }: StaggerItemProps) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Reveal on Scroll
interface RevealOnScrollProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export const RevealOnScroll = ({
  children,
  direction = 'up',
  distance = 50,
  duration = 0.6,
  delay = 0,
  className = ''
}: RevealOnScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance };
      case 'down': return { y: -distance };
      case 'left': return { x: distance };
      case 'right': return { x: -distance };
      default: return { y: distance };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Pulse Animation
interface PulseProps {
  children: ReactNode;
  scale?: number;
  duration?: number;
  className?: string;
}

export const Pulse = ({
  children,
  scale = 1.05,
  duration = 2,
  className = ''
}: PulseProps) => (
  <motion.div
    animate={{
      scale: [1, scale, 1]
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Typewriter Effect
interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export const Typewriter = ({
  text,
  speed = 50,
  className = '',
  onComplete
}: TypewriterProps) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-0.5 h-5 bg-current ml-1"
      />
    </span>
  );
};

// Morphing Shape
interface MorphingShapeProps {
  shapes: string[];
  duration?: number;
  className?: string;
}

export const MorphingShape = ({
  shapes,
  duration = 2,
  className = ''
}: MorphingShapeProps) => {
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentShapeIndex(prev => (prev + 1) % shapes.length);
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [shapes.length, duration]);

  return (
    <motion.svg
      className={className}
      viewBox="0 0 100 100"
    >
      <motion.path
        d={shapes[currentShapeIndex]}
        fill="currentColor"
        animate={{ d: shapes[currentShapeIndex] }}
        transition={{ duration: duration * 0.8, ease: "easeInOut" }}
      />
    </motion.svg>
  );
};