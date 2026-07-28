import { ArrowUpRight } from "lucide-react";

import { HeadlineReveal } from "@/components/headline-reveal";

export function ProjectUnderstandingSection() {
  return (
    <section
      id="project-understanding"
      aria-labelledby="project-understanding-heading"
      className="scroll-mt-20 border-y border-white/10 bg-[#0e1014] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
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
            variant="sweep"
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

        <div className="mt-14 grid grid-cols-12 gap-y-12 border-y border-white/12 py-10 lg:mt-20 lg:gap-x-8 lg:py-14">
          <p className="col-span-12 max-w-2xl text-lg leading-8 text-white/70 lg:col-span-5 lg:col-start-4">
            For larger residential, community, municipal, First Nations, and
            development opportunities, a non-binding Letter of Understanding
            can record the preliminary scope, shared intent, responsibilities,
            and next steps needed to begin advancing the project.
          </p>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <p className="text-sm leading-7 text-white/50">
              It creates a practical foundation for site review, funding
              conversations, supplier coordination, design adaptation,
              municipal engagement, and future agreements—without requiring
              either party to enter a construction contract prematurely.
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
      </div>
    </section>
  );
}
