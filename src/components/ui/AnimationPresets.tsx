'use client';

import { Variants } from 'framer-motion';

// Common animation variants for consistent motion design
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 }
};

export const slideInUp: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' }
};

export const slideInDown: Variants = {
  initial: { y: '-100%' },
  animate: { y: 0 },
  exit: { y: '-100%' }
};

export const slideInLeft: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' }
};

export const slideInRight: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' }
};

export const rotateIn: Variants = {
  initial: { opacity: 0, rotate: -180 },
  animate: { opacity: 1, rotate: 0 },
  exit: { opacity: 0, rotate: 180 }
};

export const flipIn: Variants = {
  initial: { opacity: 0, rotateY: -90 },
  animate: { opacity: 1, rotateY: 0 },
  exit: { opacity: 0, rotateY: 90 }
};

export const bounceIn: Variants = {
  initial: { opacity: 0, scale: 0.3 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },
  exit: { opacity: 0, scale: 0.3 }
};

export const elasticIn: Variants = {
  initial: { opacity: 0, scale: 0 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  exit: { opacity: 0, scale: 0 }
};

// Stagger animations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  },
  exit: { opacity: 0, y: -20 }
};

// Card animations
export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      type: "tween",
      ease: "easeOut"
    }
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: {
      duration: 0.2,
      type: "tween",
      ease: "easeOut"
    }
  }
};

export const cardPress: Variants = {
  rest: { scale: 1 },
  press: { scale: 0.98 }
};

// Button animations
export const buttonHover: Variants = {
  rest: {
    scale: 1,
    transition: {
      duration: 0.2,
      type: "tween",
      ease: "easeOut"
    }
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      type: "tween",
      ease: "easeOut"
    }
  },
  tap: { scale: 0.95 }
};

// Modal animations
export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const modalContent: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    y: 50
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      duration: 0.2
    }
  }
};

// Navigation animations
export const navItem: Variants = {
  rest: {
    scale: 1,
    backgroundColor: "rgba(255, 255, 255, 0)"
  },
  hover: {
    scale: 1.05,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transition: {
      duration: 0.2
    }
  },
  active: {
    backgroundColor: "rgba(255, 255, 255, 0.2)"
  }
};

// Loading animations
export const spinner: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export const pulse: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const wave: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Page transition animations
export const pageTransition: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

// Notification animations
export const notificationSlide: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Glassmorphism specific animations
export const glassHover: Variants = {
  rest: {
    backdropFilter: "blur(10px)",
    backgroundColor: "rgba(255, 255, 255, 0.1)"
  },
  hover: {
    backdropFilter: "blur(15px)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    transition: {
      duration: 0.3
    }
  }
};

export const glassPress: Variants = {
  rest: { scale: 1 },
  press: {
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  }
};

// Complex animations
export const floatingElement: Variants = {
  animate: {
    y: [0, -10, 0],
    rotate: [0, 2, 0, -2, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const morphingBlob: Variants = {
  animate: {
    borderRadius: [
      "60% 40% 30% 70%/60% 30% 70% 40%",
      "30% 60% 70% 40%/50% 60% 30% 60%",
      "60% 40% 30% 70%/60% 30% 70% 40%"
    ],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Transition configurations
export const defaultTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.3
};

export const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30
};

export const bounceTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 10
};

export const slowTransition = {
  type: "tween" as const,
  ease: "easeInOut" as const,
  duration: 0.6
};

export const fastTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.15
};