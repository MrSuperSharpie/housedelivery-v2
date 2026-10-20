"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "slide" | "fade" | "scale";
  clip?: boolean;
};

const revealViewport = { once: true, margin: "-100px" } as const;
const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function ScrollReveal({
  children,
  className,
  delay = 0,
  variant = "slide",
  clip = true,
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const initial = shouldReduceMotion
    ? { opacity: 1, y: 0, scale: 1 }
    : {
        opacity: 0,
        y: variant === "scale" ? 24 : variant === "fade" ? 20 : 40,
        scale: variant === "scale" ? 0.975 : 1,
      };

  return (
    <div className={cn(clip && "overflow-hidden", className)}>
      <motion.div
        initial={initial}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={revealViewport}
        transition={{
          duration: shouldReduceMotion ? 0 : 1,
          delay: shouldReduceMotion ? 0 : delay,
          ease: luxuryEase,
        }}
        className="transform-gpu"
      >
        {children}
      </motion.div>
    </div>
  );
}
