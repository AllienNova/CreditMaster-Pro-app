"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Spinner } from "./Loading";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const variantStyles = {
  primary:
    "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600",
  secondary:
    "border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900",
  ghost:
    "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800",
  destructive:
    "bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600",
} as const;

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
  icon: "p-2",
} as const;

const baseStyles =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed";

export type ButtonVariant = keyof typeof variantStyles;
export type ButtonSize = keyof typeof sizeStyles;

interface ButtonBaseProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

interface IconButtonProps extends ButtonBaseProps {
  size: "icon";
  "aria-label": string;
}

interface NonIconButtonProps extends ButtonBaseProps {
  size?: Exclude<ButtonSize, "icon">;
}

export type ButtonProps = IconButtonProps | NonIconButtonProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const reduced = useReducedMotion();
    const tapProps =
      reduced || disabled || isLoading ? {} : { whileTap: { scale: 0.97 } };

    return (
      <motion.button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || isLoading}
        {...tapProps}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : leftIcon ? (
          <span aria-hidden="true">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading ? (
          <span aria-hidden="true">{rightIcon}</span>
        ) : null}
      </motion.button>
    );
  },
);

Button.displayName = "Button";

export default Button;
