'use client';

import { useCallback, useRef, useEffect } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeGesture {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  velocity: number;
  duration: number;
}

interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

interface TouchGestureOptions {
  onSwipe?: (gesture: SwipeGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
  onPinch?: (gesture: PinchGesture) => void;
  swipeThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
  preventScroll?: boolean;
}

export function useTouchGestures({
  onSwipe,
  onTap,
  onDoubleTap,
  onLongPress,
  onPinch,
  swipeThreshold = 50,
  doubleTapDelay = 300,
  longPressDelay = 500,
  preventScroll = false
}: TouchGestureOptions = {}) {
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getCenter = useCallback((touch1: Touch, touch2: Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  }), []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventScroll) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    touchStartRef.current = touchPoint;
    touchEndRef.current = null;

    // Handle pinch gesture start
    if (e.touches.length === 2 && onPinch) {
      initialPinchDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
    }

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress(touchPoint);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay, preventScroll, getDistance, onPinch]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventScroll) {
      e.preventDefault();
    }

    // Clear long press timer on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle pinch gesture
    if (e.touches.length === 2 && onPinch && initialPinchDistanceRef.current) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialPinchDistanceRef.current;
      const center = getCenter(e.touches[0], e.touches[1]);

      onPinch({ scale, center });
    }
  }, [preventScroll, onPinch, getDistance, getCenter]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventScroll) {
      e.preventDefault();
    }

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Reset pinch distance
    if (e.touches.length < 2) {
      initialPinchDistanceRef.current = null;
    }

    if (!touchStartRef.current || e.changedTouches.length === 0) return;

    const touch = e.changedTouches[0];
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    touchEndRef.current = touchPoint;

    const startPoint = touchStartRef.current;
    const endPoint = touchPoint;

    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = endPoint.timestamp - startPoint.timestamp;

    // Check for swipe gesture
    if (distance >= swipeThreshold && onSwipe) {
      const velocity = distance / duration;
      let direction: SwipeGesture['direction'];

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      onSwipe({
        direction,
        distance,
        velocity,
        duration
      });
      return;
    }

    // Check for tap gestures (only if not a swipe)
    if (distance < swipeThreshold) {
      const now = Date.now();

      // Check for double tap
      if (lastTapRef.current && onDoubleTap) {
        const timeSinceLastTap = now - lastTapRef.current.timestamp;
        const distanceFromLastTap = Math.sqrt(
          Math.pow(endPoint.x - lastTapRef.current.x, 2) +
          Math.pow(endPoint.y - lastTapRef.current.y, 2)
        );

        if (timeSinceLastTap <= doubleTapDelay && distanceFromLastTap < 50) {
          onDoubleTap(endPoint);
          lastTapRef.current = null;
          return;
        }
      }

      // Single tap
      if (onTap) {
        onTap(endPoint);
      }

      lastTapRef.current = endPoint;
    }
  }, [
    preventScroll,
    swipeThreshold,
    doubleTapDelay,
    onSwipe,
    onTap,
    onDoubleTap
  ]);

  // Attach event listeners to an element
  const attachListeners = useCallback((element: HTMLElement) => {
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventScroll });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    attachListeners,
    touchStart: touchStartRef.current,
    touchEnd: touchEndRef.current
  };
}

// Specialized hook for swipe gestures
export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
} = {}) {
  return useTouchGestures({
    swipeThreshold: threshold,
    onSwipe: (gesture) => {
      switch (gesture.direction) {
        case 'left':
          onSwipeLeft?.();
          break;
        case 'right':
          onSwipeRight?.();
          break;
        case 'up':
          onSwipeUp?.();
          break;
        case 'down':
          onSwipeDown?.();
          break;
      }
    }
  });
}

// Hook for drag gestures
export function useDragGestures({
  onDragStart,
  onDrag,
  onDragEnd
}: {
  onDragStart?: (point: TouchPoint) => void;
  onDrag?: (delta: { x: number; y: number }, point: TouchPoint) => void;
  onDragEnd?: (point: TouchPoint) => void;
} = {}) {
  const isDraggingRef = useRef(false);
  const startPointRef = useRef<TouchPoint | null>(null);

  return useTouchGestures({
    onTap: (point) => {
      if (!isDraggingRef.current) {
        onDragStart?.(point);
        startPointRef.current = point;
        isDraggingRef.current = true;
      }
    },
    preventScroll: true
  });
}

// Hook for pinch-to-zoom gestures
export function usePinchGestures({
  onPinchStart,
  onPinch,
  onPinchEnd,
  minScale = 0.5,
  maxScale = 3
}: {
  onPinchStart?: (gesture: PinchGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onPinchEnd?: (gesture: PinchGesture) => void;
  minScale?: number;
  maxScale?: number;
} = {}) {
  const isPinchingRef = useRef(false);

  return useTouchGestures({
    onPinch: (gesture) => {
      const clampedScale = Math.max(minScale, Math.min(maxScale, gesture.scale));
      const clampedGesture = { ...gesture, scale: clampedScale };

      if (!isPinchingRef.current) {
        onPinchStart?.(clampedGesture);
        isPinchingRef.current = true;
      } else {
        onPinch?.(clampedGesture);
      }
    },
    preventScroll: true
  });
}