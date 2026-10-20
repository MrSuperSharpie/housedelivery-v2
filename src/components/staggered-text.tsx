"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type StaggeredTextProps = {
  segments: readonly string[];
  className?: string;
  delay?: number;
};

const revealViewport = { once: true, margin: "-100px" } as const;
const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

const sentenceVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: luxuryEase },
  },
};

export function StaggeredText({
  segments,
  className,
  delay = 0,
}: StaggeredTextProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.p
      aria-label={segments.join(" ")}
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={revealViewport}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: shouldReduceMotion ? 0 : 0.12,
          },
        },
      }}
      className={className}
    >
      {segments.map((segment) => (
        <motion.span
          key={segment}
          aria-hidden="true"
          variants={sentenceVariants}
          className="inline-block max-w-full transform-gpu whitespace-normal"
        >
          {segment}&nbsp;
        </motion.span>
      ))}
    </motion.p>
  );
}
