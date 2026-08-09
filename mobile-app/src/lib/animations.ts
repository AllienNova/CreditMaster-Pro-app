/**
 * Fynvita Mobile Animation System
 * Reanimated-based presets matching the web framer-motion system.
 * Respects reduced-motion accessibility preference.
 */

import { useEffect, useState } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  type WithSpringConfig,
} from "react-native-reanimated";
import { AccessibilityInfo } from "react-native";

// ============================================================================
// Config constants
// ============================================================================

export const SPRING_CONFIG: WithSpringConfig = {
  stiffness: 400,
  damping: 30,
  mass: 1,
};

export const DURATION = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ============================================================================
// Shared reduce-motion hook
// ============================================================================

function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (active) setReduceMotion(enabled);
      },
    );

    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}

// ============================================================================
// useFadeIn
// ============================================================================

/**
 * Returns an animated style that fades from 0 → 1 on mount.
 * Skips animation when reduce-motion is enabled.
 */
export function useFadeIn(delay = 0) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: DURATION.normal }),
    );
  }, [reduceMotion, delay, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// ============================================================================
// useSlideUp
// ============================================================================

const SLIDE_DISTANCE = 20;

/**
 * Returns an animated style that fades in and slides up on mount.
 * Skips animation when reduce-motion is enabled.
 */
export function useSlideUp(delay = 0) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : SLIDE_DISTANCE);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: DURATION.normal }),
    );
    translateY.value = withDelay(delay, withSpring(0, SPRING_CONFIG));
  }, [reduceMotion, delay, opacity, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

// ============================================================================
// useStaggerIndex
// ============================================================================

const DEFAULT_STAGGER = 60; // ms between items

/**
 * Returns a delay-based animated style for list items.
 * Each index gets an entrance animation staggered by `stagger` ms.
 */
export function useStaggerIndex(index: number, stagger = DEFAULT_STAGGER) {
  return useSlideUp(index * stagger);
}
