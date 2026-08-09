"use client";

import { motion } from "framer-motion";
import { pageTransition } from "@/lib/animations/variants";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}
