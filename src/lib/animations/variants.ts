import type { Variants, Transition } from "framer-motion";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];

const DURATION = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
};

const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const smooth = (duration: number = DURATION.normal): Transition => ({
  duration,
  ease: EASE_OUT_EXPO,
});

// ── Fade ──

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: smooth() },
  exit: { opacity: 0, transition: smooth(DURATION.fast) },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: smooth() },
  exit: { opacity: 0, y: 10, transition: smooth(DURATION.fast) },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0, transition: smooth() },
  exit: { opacity: 0, y: -10, transition: smooth(DURATION.fast) },
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: smooth() },
  exit: { opacity: 0, x: -10, transition: smooth(DURATION.fast) },
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: smooth() },
  exit: { opacity: 0, x: 10, transition: smooth(DURATION.fast) },
};

// ── Scale ──

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: smooth() },
  exit: { opacity: 0, scale: 0.95, transition: smooth(DURATION.fast) },
};

// ── Slide ──

export const slideUp: Variants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { ...smooth(DURATION.slow) } },
  exit: { y: "100%", transition: smooth(DURATION.normal) },
};

export const slideDown: Variants = {
  initial: { y: "-100%" },
  animate: { y: 0, transition: smooth(DURATION.slow) },
  exit: { y: "-100%", transition: smooth(DURATION.normal) },
};

// ── Stagger ──

export function staggerContainer(staggerDelay = 0.08): Variants {
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        ease: EASE_IN_OUT,
      },
    },
  };
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: smooth(),
  },
};

// ── Page Transition ──

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

// ── Reduced Motion variants (opacity-only, near-instant) ──

export const reducedMotion: Record<string, Variants> = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.01 } },
    exit: { opacity: 0, transition: { duration: 0.01 } },
  },
  static: {
    initial: {},
    animate: {},
    exit: {},
  },
};

// ── Helpers ──

export { spring, smooth, DURATION, EASE_OUT_EXPO, EASE_IN_OUT };
