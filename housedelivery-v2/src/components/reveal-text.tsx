"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type RevealTextProps = {
  text: string;
  className?: string;
  delay?: number;
};

const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.72,
      ease: [0.25, 1, 0.5, 1],
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
      className={className}
      initial={shouldReduceMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
      variants={{
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: 0.03,
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
