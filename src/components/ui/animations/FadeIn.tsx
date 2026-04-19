"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  reducedMotion,
} from "@/lib/animations/variants";
import type { ReactNode } from "react";

const directionMap = {
  none: fadeIn,
  up: fadeInUp,
  down: fadeInDown,
  left: fadeInLeft,
  right: fadeInRight,
} as const;

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  direction?: keyof typeof directionMap;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration,
  className,
  ...props
}: FadeInProps) {
  const reduced = useReducedMotion();
  const variants = reduced ? reducedMotion.fadeIn : directionMap[direction];

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={
        duration || delay
          ? { delay, duration: duration ?? undefined }
          : undefined
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
