"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { HeadlineReveal } from "@/components/headline-reveal";
import type { HomeModel } from "@/data/models";
import { cn } from "@/lib/cn";

type HomeFloorPlanViewerProps = {
  model: HomeModel;
};

export function HomeFloorPlanViewer({ model }: HomeFloorPlanViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <section
      id="plans"
      className="scroll-mt-20 border-y border-white/10 bg-[#0e1014] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="eyebrow">Plan and technical study</p>
            <HeadlineReveal variant="sweep" className="mt-6">
              <h2 className="text-[clamp(3rem,5.8vw,6.5rem)] font-medium leading-[0.9] tracking-[-0.065em]">
                Designed to flow.
                <br />
                <span className="text-white/40">
                  Engineered to endure.
                </span>
              </h2>
            </HeadlineReveal>
          </div>
          <p className="max-w-xl text-base leading-7 text-white/48 lg:justify-self-end">
            The reference plan establishes room relationships and circulation.
            Foundation, structure, envelope, and services are adapted to the
            selected site and local authority requirements.
          </p>
        </div>

        <div className="mt-16 overflow-hidden border border-white/14 bg-[#090a0d]">
          <div className="flex items-center justify-between border-b border-white/12 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Maximize2 size={14} className="text-white/42" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/48">
                {model.name} / Reference floor plan
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsZoomed((zoomed) => !zoomed)}
              className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/58 transition-colors hover:bg-white hover:text-black"
              aria-pressed={isZoomed}
            >
              {isZoomed ? <Minus size={12} /> : <Plus size={12} />}
              {isZoomed ? "Fit plan" : "Enlarge"}
            </button>
          </div>

          <div className="overflow-auto p-3 sm:p-6 lg:p-10">
            <div
              className={cn(
                "relative mx-auto aspect-[1.42/1] min-w-[680px] bg-[#e9e7e1] transition-[width] duration-500",
                isZoomed ? "w-[145%]" : "w-full",
              )}
            >
              <Image
                src={model.floorPlanImage}
                alt={`${model.name} floor plan drawing`}
                fill
                quality={100}
                unoptimized={true}
                sizes={isZoomed ? "140vw" : "95vw"}
                className="object-contain p-5 sm:p-9"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 grid border-t border-white/14 sm:grid-cols-2 lg:grid-cols-4">
          {model.planCallouts.map((callout, index) => (
            <div
              key={callout}
              className="grid grid-cols-[36px_1fr] border-b border-white/12 py-5 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 lg:border-b-0"
            >
              <span className="text-[9px] tracking-[0.18em] text-white/28">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-xs text-white/62">{callout}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
