"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { fadeInUp, reducedMotion } from "@/lib/animations/variants";
import type { ReactNode } from "react";

interface ScrollRevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  margin?: string;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  once = true,
  margin = "-50px",
  ...props
}: ScrollRevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={reduced ? reducedMotion.fadeIn : fadeInUp}
      initial="initial"
      whileInView="animate"
      viewport={{ once, margin }}
      transition={delay ? { delay } : undefined}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
