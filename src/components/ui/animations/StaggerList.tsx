"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  staggerContainer,
  staggerItem,
  reducedMotion,
} from "@/lib/animations/variants";
import { Children, useMemo, type ReactNode } from "react";

interface StaggerListProps {
  children: ReactNode;
  stagger?: number;
  className?: string;
  as?: "div" | "ul" | "ol";
}

export function StaggerList({
  children,
  stagger = 0.08,
  className,
  as: Tag = "div",
}: StaggerListProps) {
  const reduced = useReducedMotion();
  const MotionTag = useMemo(() => motion.create(Tag), [Tag]);

  return (
    <MotionTag
      variants={reduced ? reducedMotion.static : staggerContainer(stagger)}
      initial="initial"
      animate="animate"
      className={className}
    >
      {Children.map(children, (child) =>
        child ? (
          <motion.div
            variants={reduced ? reducedMotion.fadeIn : staggerItem}
          >
            {child}
          </motion.div>
        ) : null
      )}
    </MotionTag>
  );
}
