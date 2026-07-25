"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import type { HomeModel } from "@/data/models";

type HomeDetailHeroProps = {
  model: HomeModel;
  modelNumber: number;
  modelCount: number;
};

export function HomeDetailHero({
  model,
  modelNumber,
  modelCount,
}: HomeDetailHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "13%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative h-[100svh] min-h-[760px] overflow-hidden border-b border-white/10 sm:min-h-[860px]"
    >
      <motion.div
        className="absolute inset-x-0 -top-[10%] -bottom-[10%] bg-[#0b0c10]"
        style={{ y: imageY }}
      >
        <Image
          src={model.heroImage}
          alt={`${model.name} House exterior`}
          fill
          quality={100}
          unoptimized={true}
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,12,16,.52)_0%,rgba(11,12,16,.08)_40%,rgba(11,12,16,.92)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,12,16,.46)_0%,transparent_65%)]" />
      <div className="noise absolute inset-0 opacity-[0.075]" />

      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 mx-auto flex h-full min-h-[760px] max-w-[1600px] flex-col justify-between px-5 pb-8 pt-28 sm:min-h-[860px] sm:px-8 lg:px-12 lg:pb-10"
      >
        <div className="flex items-center justify-between">
          <Link
            href="/#models"
            className="inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} />
            Collection
          </Link>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/55">
            Model {String(modelNumber).padStart(2, "0")} /{" "}
            {String(modelCount).padStart(2, "0")}
          </p>
        </div>

        <div>
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <span className="border border-white/30 bg-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
              {model.locationLabel}
            </span>
            <span className="border border-white/30 bg-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
              Pre-engineered residence
            </span>
          </div>

          <motion.h1
            initial={
              shouldReduceMotion ? false : { opacity: 0, y: 40 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="max-w-[1300px] text-[clamp(4rem,10vw,10rem)] font-medium leading-[0.82] tracking-[-0.078em]"
          >
            {model.name}
            <br />
            <span className="text-white/58">House</span>
          </motion.h1>

          <div className="mt-10 grid items-end gap-8 border-t border-white/30 pt-6 sm:grid-cols-[1fr_auto]">
            <p className="max-w-xl text-sm leading-6 text-white/66 sm:text-base sm:leading-7">
              {model.summary}
            </p>
            <div className="flex items-end gap-3 sm:text-right">
              <span className="text-5xl font-light tracking-[-0.07em] sm:text-7xl">
                {model.squareFeet.toLocaleString()}
              </span>
              <span className="pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Sq. ft.
                <br />
                total area
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <a
        href="#overview"
        aria-label="Read the project overview"
        className="absolute bottom-10 right-6 z-20 hidden size-14 place-items-center rounded-full border border-white/35 transition-colors hover:bg-white hover:text-black md:grid lg:right-12"
      >
        <ArrowDown size={16} />
      </a>
    </section>
  );
}
