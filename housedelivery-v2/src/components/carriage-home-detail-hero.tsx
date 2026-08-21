"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { CarriageHome } from "@/data/carriage-homes";

type CarriageHomeDetailHeroProps = {
  model: CarriageHome;
  modelNumber: number;
  modelCount: number;
};

const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CarriageHomeDetailHero({
  model,
  modelNumber,
  modelCount,
}: CarriageHomeDetailHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const heroImage = model.images[0];

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-white/10 bg-[#0b0c10] px-5 pb-20 pt-28 sm:px-8 sm:pb-24 sm:pt-32 lg:px-12 lg:pb-28"
    >
      <div className="noise pointer-events-none absolute inset-0 opacity-[0.055]" />

      <div className="relative mx-auto max-w-[1504px]">
        <div className="flex items-center justify-between gap-6">
          <Link
            href="/#carriage-homes"
            className="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/58 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Laneway &amp; Carriage homes
          </Link>
          <p className="shrink-0 text-[8px] uppercase tracking-[0.2em] text-white/38 sm:text-[9px]">
            Residence {String(modelNumber).padStart(2, "0")} /{" "}
            {String(modelCount).padStart(2, "0")}
          </p>
        </div>

        <motion.div
          data-carriage-hero-frame
          initial={
            shouldReduceMotion
              ? false
              : { clipPath: "inset(0 0 100% 0)", opacity: 0.72, y: 18 }
          }
          animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 1.1,
            ease: luxuryEase,
          }}
          className="relative mx-auto mt-10 aspect-[25/14] w-full max-w-[760px] overflow-hidden bg-[#111318] sm:mt-12 lg:mt-14"
        >
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            fill
            quality={95}
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 895px) calc(100vw - 64px), 760px"
            className="object-contain"
          />
        </motion.div>

        <div className="mt-7 grid gap-10 border-t border-white/16 pt-5 lg:mt-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-start lg:gap-20">
          <div>
            <motion.h1
              initial={
                shouldReduceMotion ? false : { opacity: 0, y: 40 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 1,
                delay: shouldReduceMotion ? 0 : 0.16,
                ease: luxuryEase,
              }}
              className="max-w-5xl text-[clamp(3.4rem,8vw,7.4rem)] font-medium leading-[0.86] tracking-[-0.072em]"
            >
              {model.name}
            </motion.h1>

            <div className="mt-7 flex flex-wrap gap-3">
              <span className="border border-white/22 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-[9px]">
                Laneway / Carriage
              </span>
              <span className="border border-white/22 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-[9px]">
                Compact residence
              </span>
            </div>
          </div>

          <motion.div
            initial={
              shouldReduceMotion ? false : { opacity: 0, y: 24 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 1,
              delay: shouldReduceMotion ? 0 : 0.3,
              ease: luxuryEase,
            }}
            className="border-l border-white/16 pl-5 sm:pl-7"
          >
            <p className="text-2xl font-medium leading-tight tracking-[-0.04em] text-white/82 sm:text-3xl">
              {model.heroStatement}
            </p>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/48">
              {model.description}
            </p>
          </motion.div>
        </div>
      </div>

      <a
        href="#overview"
        aria-label={`Read the ${model.name} overview`}
        className="absolute bottom-8 right-5 hidden size-12 place-items-center rounded-full border border-white/28 text-white/70 transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:grid lg:right-12"
      >
        <ArrowDown size={15} aria-hidden="true" />
      </a>
    </section>
  );
}
