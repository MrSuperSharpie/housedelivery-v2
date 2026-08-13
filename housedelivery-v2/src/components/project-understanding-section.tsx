import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

import { DeliveryTimeline } from "@/components/delivery-timeline";
import { HeadlineReveal } from "@/components/headline-reveal";

export function ProjectUnderstandingSection() {
  return (
    <section
      id="project-understanding"
      aria-labelledby="project-understanding-heading"
      className="scroll-mt-20 border-y border-white/10 bg-[#0e1014] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid grid-cols-12 gap-y-12 border-t border-white/12 pt-7 lg:gap-x-8">
          <div className="col-span-12 lg:col-span-3">
            <p className="eyebrow">From interest to intention</p>
            <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-white/28">
              Project Understanding / Non-binding
            </p>
          </div>

          <HeadlineReveal
            className="col-span-12 lg:col-span-9 lg:col-start-4"
          >
            <h2
              id="project-understanding-heading"
              className="max-w-[1200px] text-[clamp(3.5rem,8vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90"
            >
              Give the opportunity
              <br />
              <span className="text-white/38">a shape.</span>
            </h2>
          </HeadlineReveal>
        </div>

        <div className="mt-12 grid grid-cols-12 gap-y-10 border-y border-white/12 py-10 lg:mt-16 lg:gap-x-8 lg:py-12">
          <figure className="col-span-12 lg:col-span-7">
            <div className="relative aspect-[16/9] overflow-hidden bg-[#13151a]">
              <Image
                src="/Cascade-1.png"
                alt="Exterior rendering of The Cascade House Delivery home"
                fill
                quality={90}
                sizes="(max-width: 1023px) 100vw, (max-width: 1599px) 58vw, 878px"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 flex items-center justify-between gap-5 border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.18em] text-white/32">
              <span>The Cascade</span>
              <span>Opportunity / Defined</span>
            </figcaption>
          </figure>

          <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:self-end">
            <p className="text-lg leading-8 text-white/70">
              Larger residential, First Nations, municipal, community, and
              development projects may begin with a structured project
              conversation or non-binding Letter of Understanding to define
              the preliminary site, scope, responsibilities, project pathway,
              and next steps.
            </p>
            <p className="mt-6 text-sm leading-7 text-white/50">
              It bridges early interest to site review, funding conversations,
              supplier coordination, and a future project agreement—without
              requiring a construction contract prematurely.
            </p>
            <a
              href="#reserve"
              className="group mt-9 inline-flex items-center gap-4 border-b border-white/35 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-white hover:text-white"
            >
              Begin a project conversation
              <ArrowUpRight
                size={14}
                strokeWidth={1.4}
                aria-hidden="true"
                className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>
        </div>

        <p className="mt-7 max-w-2xl text-xs leading-6 text-white/34">
          A Project Understanding is not required before an individual
          homeowner begins an initial conversation with House Delivery.
        </p>

        <DeliveryTimeline
          embedded
          eyebrow="Coordination before construction"
          headlinePrimary="Resolve more before"
          headlineSecondary="the site is waiting."
          introCopy="House Delivery moves design, procurement, factory production, site preparation, logistics, and local crew coordination upstream, with several workstreams advancing at the same time. Factory production and site preparation happen at the same time—not one after the other."
        />
      </div>
    </section>
  );
}
