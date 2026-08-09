"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#a855f7", // purple-500
  "#fbbf24", // amber-400
  "#ec4899", // pink-500
];

type Shape = "square" | "rect";

interface Particle {
  id: number;
  color: string;
  shape: Shape;
  x: number;
  y: number;
  rotate: number;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: Math.random() > 0.5 ? "square" : "rect",
    x: randomBetween(-300, 300),
    y: randomBetween(-400, 100),
    rotate: randomBetween(-720, 720),
  }));
}

interface ConfettiProps {
  origin?: { x: number; y: number };
  onDone?: () => void;
}

export function Confetti({ origin, onDone }: ConfettiProps) {
  const reduced = useReducedMotion();
  const doneRef = useRef(false);

  const defaultOrigin = {
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 400,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 300,
  };
  const pos = origin ?? defaultOrigin;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (reduced || typeof document === "undefined") return null;

  const particles = generateParticles(40);

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: pos.x, y: pos.y, opacity: 1, rotate: 0 }}
          animate={{
            x: pos.x + p.x,
            y: pos.y + p.y + 200, // gravity offset
            opacity: [1, 1, 0],
            rotate: p.rotate,
          }}
          transition={{
            duration: 2.5,
            ease: [0.2, 0, 0.8, 1],
            opacity: { times: [0, 0.6, 1] },
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: p.shape === "square" ? 6 : 4,
            height: p.shape === "square" ? 6 : 8,
            backgroundColor: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
