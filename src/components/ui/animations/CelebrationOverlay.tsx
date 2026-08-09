"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Confetti } from "./Confetti";
import { fadeIn } from "@/lib/animations/variants";

export interface CelebrationOverlayProps {
  show: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function CelebrationOverlay({
  show,
  onClose,
  title,
  subtitle,
  ctaLabel,
  onCtaClick,
}: CelebrationOverlayProps) {
  const reduced = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  // Focus the close button when overlay opens
  useEffect(() => {
    if (show) {
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [show]);

  // Escape key handler
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [show, onClose]);

  // Focus trap
  useEffect(() => {
    if (!show || !overlayRef.current) return;
    const el = overlayRef.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    el.addEventListener("keydown", trap);
    return () => el.removeEventListener("keydown", trap);
  }, [show]);

  const backdropVariants: Variants = fadeIn;
  const contentVariants: Variants = reduced
    ? fadeIn
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
      };

  return (
    <AnimatePresence>
      {show && (
        <>
          {!reduced && <Confetti />}
          <motion.div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-live="polite"
            aria-label={title}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
            >
              {/* Close button */}
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close celebration"
                className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 2l12 12M14 2L2 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* Animated checkmark */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-24 h-24">
                  <svg
                    viewBox="0 0 96 96"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                    aria-hidden="true"
                  >
                    <circle cx="48" cy="48" r="44" className="fill-emerald-50 dark:fill-emerald-900/30" />
                    <circle
                      cx="48"
                      cy="48"
                      r="36"
                      className="stroke-emerald-500"
                      strokeWidth="4"
                      fill="none"
                      style={{
                        strokeDasharray: 226,
                        strokeDashoffset: 226,
                        animation: reduced
                          ? "none"
                          : "draw-circle 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
                      }}
                    />
                    <path
                      d="M32 48l12 12 20-22"
                      className="stroke-emerald-500"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      style={{
                        strokeDasharray: 50,
                        strokeDashoffset: 50,
                        animation: reduced
                          ? "none"
                          : "draw-check 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards",
                      }}
                    />
                  </svg>
                  <style>{`
                    @keyframes draw-circle {
                      to { stroke-dashoffset: 0; }
                    }
                    @keyframes draw-check {
                      to { stroke-dashoffset: 0; }
                    }
                  `}</style>
                </div>
              </div>

              {/* Title */}
              <motion.h2
                initial={reduced ? {} : { opacity: 0, y: 8 }}
                animate={reduced ? {} : { opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.3 }}
                className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
              >
                {title}
              </motion.h2>

              {/* Subtitle */}
              {subtitle && (
                <motion.p
                  initial={reduced ? {} : { opacity: 0 }}
                  animate={reduced ? {} : { opacity: 1 }}
                  transition={{ delay: 1.3, duration: 0.3 }}
                  className="text-gray-500 dark:text-slate-400 mb-6"
                >
                  {subtitle}
                </motion.p>
              )}

              {/* CTA */}
              {ctaLabel && (
                <motion.div
                  initial={reduced ? {} : { opacity: 0 }}
                  animate={reduced ? {} : { opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.3 }}
                >
                  <button
                    onClick={() => {
                      onCtaClick?.();
                      onClose();
                    }}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    {ctaLabel}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
