"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

import { cn } from "@/lib/cn";

type RevealTextProps = {
  text: string;
  className?: string;
  delay?: number;
};

const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function RevealText({
  text,
  className,
  delay = 0,
}: RevealTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.trim().split(/\s+/);

  return (
    <motion.span
      aria-label={text}
      className={cn("inline-block overflow-hidden align-bottom", className)}
      initial={shouldReduceMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: shouldReduceMotion ? 0 : 0.035,
          },
        },
      }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <motion.span
            aria-hidden="true"
            className="inline-block will-change-transform"
            variants={wordVariants}
          >
            {word}
          </motion.span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </motion.span>
  );
}
