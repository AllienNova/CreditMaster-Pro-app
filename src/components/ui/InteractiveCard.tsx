"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type CardElement = "div" | "article" | "li";

interface InteractiveCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  as?: CardElement;
}

export function InteractiveCard({
  children,
  onClick,
  className = "",
  as = "div",
}: InteractiveCardProps) {
  const reduced = useReducedMotion();

  const hoverProps = reduced
    ? {}
    : { whileHover: { y: -2 }, whileTap: { scale: 0.99 } };

  const MotionComponent = motion[as];

  return (
    <MotionComponent
      {...hoverProps}
      onClick={onClick}
      className={[
        "transition-shadow duration-200",
        "hover:shadow-md dark:hover:shadow-slate-900/50",
        onClick ? "cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </MotionComponent>
  );
}

export default InteractiveCard;
