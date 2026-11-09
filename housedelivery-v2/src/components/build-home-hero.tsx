"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { HeadlineReveal } from "@/components/headline-reveal";
import styles from "@/app/build-your-home/landing.module.css";

// Composition, type metrics and parallax follow the approved LuxuryHero.
// Kept route-specific so its copy and acquisition CTA do not alter the homepage.
export function BuildHomeHero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const video = videoRef.current;
    let active = true;
    function syncMotionPreference() {
      if (preference.matches) video?.pause();
    }
    function syncVideoState() {
      if (!active || !video) return;
      if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        setVideoFailed(true);
      } else if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setHasPlayed(true);
      }
    }
    syncMotionPreference();
    // Match the approved homepage's handling of playback before hydration.
    queueMicrotask(syncVideoState);
    video?.addEventListener("error", syncVideoState, true);
    preference.addEventListener("change", syncMotionPreference);
    return () => {
      active = false;
      video?.removeEventListener("error", syncVideoState, true);
      preference.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  return (
    <section ref={heroRef} className={styles.hero} aria-labelledby="build-home-heading">
      <motion.div className={styles.heroImage} style={reducedMotion ? undefined : { y: imageY }}>
        <Image src="/Langley-3.avif" alt="The Langley interior reference, with a double-height living space, natural light and an open connection to the garden" fill sizes="100vw" unoptimized preload className={styles.cover} />
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
          onPlaying={() => setHasPlayed(true)}
          onError={() => setVideoFailed(true)}
          data-active={hasPlayed && !videoFailed}
          className={styles.heroVideo}
        >
          <source src="/videos/house-delivery-hero.mp4" type="video/mp4" onError={() => setVideoFailed(true)} />
        </video>
      </motion.div>
      <div className={styles.heroShade} />
      <div className={`noise ${styles.heroNoise}`} />
      <div className={styles.heroInner}>
        <div className={styles.heroTopline}>
          <p>House Delivery / British Columbia</p>
          <p className={styles.heroCredit}>House Delivery / Home collection</p>
        </div>
        <div className={styles.heroComposition}>
          <div className={styles.heroHeadline}>
            <p className={styles.heroLabel}>Exceptional Design. Lasting Value.</p>
            <HeadlineReveal trigger="mount">
              <h1 id="build-home-heading">Exceptional Quality.<br /><span>Intelligent Value.</span><br />Built to Last.</h1>
            </HeadlineReveal>
          </div>
          <div className={styles.heroAside}>
            <p>An expensive home isn’t necessarily a better home.</p>
            <p className={styles.heroAsideDetail}>We combine precision global engineering with local Canadian construction to deliver high-performance homes built for generations.</p>
            <a href="#project-inquiry" className={`${styles.button} ${styles.lightButton}`}>Start Your Build <ArrowUpRight size={15} aria-hidden="true" /></a>
            <a href="#design-studio" className={styles.heroSecondary}>Explore the Design Studio <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
        <div className={styles.heroFooter}>
          <p><span>Design-led homes</span><span>Canadian housing company</span></p>
          <p><span>35+ years</span><span>Our founder’s manufacturing experience</span></p>
          <a href="#why-house-delivery" aria-label="Discover why House Delivery"><ArrowDown size={18} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
