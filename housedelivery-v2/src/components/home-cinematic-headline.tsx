"use client";

import { motion } from "framer-motion";
import { useSyncExternalStore } from "react";

const motionQuery = "(prefers-reduced-motion: no-preference)";
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function canAnimate() { return window.matchMedia(motionQuery).matches; }
function serverMotion() { return false; }

/** Server-rendered words stay readable without JavaScript or animation. */
export function HomeCinematicHeadline({ text, priority = false }: { text: string; priority?: boolean }) {
  const motionAllowed = useSyncExternalStore(subscribeMotion, canAnimate, serverMotion);
  const animate = motionAllowed && !priority;
  return (
    <span className="home-editorial-headline-mask">
      <motion.span
        key={animate ? "reveal" : "still"}
        className="home-editorial-headline-words"
        initial={animate ? { y: "0.24em", clipPath: "inset(0 0 100% 0)" } : false}
        whileInView={{ y: "0em", clipPath: "inset(0 0 0% 0)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: animate ? 1.1 : 0, ease: [0.16, 1, 0.3, 1] }}
      >{text}</motion.span>
    </span>
  );
}
