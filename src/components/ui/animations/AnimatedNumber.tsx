"use client";

import { useEffect, useRef } from "react";
import { useSpring, useMotionValue, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(reduced ? value : 0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
  });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced) {
      // Skip spring — set value directly and update DOM immediately
      motionValue.jump(value);
      if (ref.current) {
        ref.current.textContent = `${prefix}${formatNumber(value, decimals)}${suffix}`;
      }
    } else {
      motionValue.set(value);
    }
  }, [value, motionValue, reduced, prefix, suffix, decimals]);

  useEffect(() => {
    if (reduced) return;
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${formatNumber(latest, decimals)}${suffix}`;
      }
    });
    return unsubscribe;
  }, [springValue, prefix, suffix, decimals, reduced]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {formatNumber(value, decimals)}
      {suffix}
    </motion.span>
  );
}

function formatNumber(num: number, decimals: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
