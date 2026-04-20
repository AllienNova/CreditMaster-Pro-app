"use client";

import { motion } from "framer-motion";
import { useId, type KeyboardEvent } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AnimatedSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export function AnimatedSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  id: providedId,
}: AnimatedSwitchProps) {
  const generatedId = useId();
  const switchId = providedId ?? generatedId;
  const reduced = useReducedMotion();

  function toggle() {
    if (!disabled) onChange(!checked);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  }

  const thumbTransition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 500, damping: 35 };

  return (
    <div className="flex items-center gap-3">
      <div
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={[
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full",
          "transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          checked
            ? "bg-emerald-500 dark:bg-emerald-500"
            : "bg-gray-300 dark:bg-slate-600",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ]
          .join(" ")
          .trim()}
      >
        <motion.div
          layout
          transition={thumbTransition}
          className={[
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm",
            "absolute top-0.5",
            checked ? "left-[22px]" : "left-0.5",
          ].join(" ")}
        />
      </div>
      {label && (
        <label
          className={[
            "text-sm font-medium text-gray-700 dark:text-slate-300",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
          onClick={toggle}
        >
          {label}
        </label>
      )}
    </div>
  );
}

export default AnimatedSwitch;
