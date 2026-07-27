"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type HeadlineRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "clip" | "sweep";
};

const revealViewport = { once: true, amount: 0.15 } as const;
const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HeadlineReveal({
  children,
  className,
  delay = 0,
  variant = "clip",
}: HeadlineRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const initial =
    variant === "sweep"
      ? {
          opacity: 0,
          x: -20,
          clipPath: "inset(0 100% 0 0)",
        }
      : {
          opacity: 0,
          y: 40,
        };
  const visible =
    variant === "sweep"
      ? {
          opacity: 1,
          x: 0,
          clipPath: "inset(0 0% 0 0)",
        }
      : {
          opacity: 1,
          y: 0,
        };

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        initial={shouldReduceMotion ? false : initial}
        whileInView={visible}
        viewport={revealViewport}
        transition={{
          duration: shouldReduceMotion ? 0 : 1,
          delay: shouldReduceMotion ? 0 : delay,
          ease: luxuryEase,
        }}
        className="transform-gpu will-change-[transform,opacity,clip-path]"
      >
        {children}
      </motion.div>
    </div>
  );
}
