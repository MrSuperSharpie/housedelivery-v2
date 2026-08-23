"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { HeadlineReveal } from "@/components/headline-reveal";

type LuxuryHeroProps = {
  image: string;
  productStatement?: string;
  supportingCopy?: string;
};

export function LuxuryHero({
  image,
  productStatement,
  supportingCopy = "Exceptional design. Remarkable value. A faster way into a place that is proudly yours.",
}: LuxuryHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative min-h-[900px] overflow-hidden border-b border-white/10 lg:min-h-screen"
    >
      <motion.div
        className="absolute inset-0 -top-[12%] bg-[#0b0c10]"
        style={{ y: imageY }}
      >
        <Image
          src={image}
          alt=""
          fill
          quality={100}
          unoptimized={true}
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <video
          autoPlay
          muted
          loop
          playsInline
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center motion-reduce:hidden"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,12,16,.70)_0%,rgba(11,12,16,.60)_48%,rgba(11,12,16,.50)_100%)]" />
      <div className="noise absolute inset-0 opacity-[0.08]" />

      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 mx-auto flex min-h-[900px] max-w-[1600px] flex-col justify-end px-5 pb-8 pt-36 sm:px-8 lg:min-h-screen lg:px-12 lg:pb-10"
      >
        <div className="mb-auto flex items-center justify-between pt-4 text-[10px] uppercase tracking-[0.2em] text-white/60">
          <span>Architectural homes · Made attainable</span>
          <span className="hidden sm:block">49.2827° N / 123.1207° W</span>
        </div>

        <div className="grid grid-cols-12 items-end gap-y-12 pb-16 lg:gap-x-8 lg:pb-20">
          <div className="col-span-12 lg:col-span-9">
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mb-7 text-xs font-medium uppercase tracking-[0.24em] text-white/65"
            >
              Factory precision / A faster path home
            </motion.p>
            <HeadlineReveal>
              <h1 className="max-w-[1100px] text-[clamp(4rem,10.7vw,10.5rem)] font-medium leading-[0.79] tracking-[-0.075em]">
                More home.
                <br />
                <span className="text-white/62">Less waiting.</span>
              </h1>
            </HeadlineReveal>
            {productStatement ? (
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.5 }}
                className="mt-8 max-w-3xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8"
              >
                {productStatement}
              </motion.p>
            ) : null}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.6 }}
            className="col-span-12 border-l border-white/25 pl-6 sm:col-span-8 sm:col-start-5 lg:col-span-3 lg:col-start-10"
          >
            <p className="max-w-sm text-base leading-7 text-white/72">
              {supportingCopy}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <a
                href="#models"
                className="inline-flex min-h-12 items-center justify-between gap-5 border border-white bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Explore the Homes
                <ArrowDown size={14} />
              </a>
              <Link
                href="/plan-a-housing-project"
                className="inline-flex min-h-12 items-center justify-between gap-5 border border-white/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:border-white hover:bg-white hover:text-[#0b0c10] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Plan a Housing Project
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-12 border-t border-white/25">
          {[
            ["~120", "Days to delivery"],
            ["13", "Architectural homes"],
            ["Built", "For belonging"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="col-span-12 flex items-end gap-4 border-b border-white/15 py-5 last:border-b-0 sm:col-span-4 sm:border-b-0 sm:border-r sm:px-7 sm:first:pl-0 sm:last:border-r-0"
            >
              <span className="text-4xl font-light tracking-[-0.06em]">
                {value}
              </span>
              <span className="pb-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                {label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <a
        href="#models"
        aria-label="Explore homes"
        className="absolute bottom-10 right-6 z-20 hidden size-14 place-items-center rounded-full border border-white/35 text-white transition-colors hover:bg-white hover:text-black md:grid lg:right-12"
      >
        <ArrowDown size={17} />
      </a>
    </section>
  );
}
