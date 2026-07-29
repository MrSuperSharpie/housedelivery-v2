import {
  BadgeCheck,
  FileCheck2,
  Landmark,
  Layers3,
  MapPinned,
} from "lucide-react";

import { HeadlineReveal } from "@/components/headline-reveal";

const advantages = [
  {
    number: "01",
    title: "Faster permitting pathway",
    description:
      "Regional design templates reduce early-stage repetition and give local reviewers a clearer, more consistent package once the design is adapted to the site.",
    icon: FileCheck2,
  },
  {
    number: "02",
    title: "Financing trust",
    description:
      "Standardized plans and coordinated documentation create a more legible project record for lender review, subject to each borrower and lender.",
    icon: Landmark,
  },
  {
    number: "03",
    title: "Standardized engineering",
    description:
      "Established layouts and performance targets provide a repeatable technical baseline before local structural, climate, foundation, and code engineering.",
    icon: Layers3,
  },
] as const;

type CmhcFeatureProps = {
  headlinePrimary?: string;
  headlineSecondary?: string;
  supportingCopy?: string;
};

export function CmhcFeature({
  headlinePrimary = "Standardized by design.",
  headlineSecondary = "Site-ready by adaptation.",
  supportingCopy = "Standardized designs can create a faster route to a site-specific answer. House Delivery Inc. uses Canada's Housing Design Catalogue as a proven starting point, then coordinates the site-specific work: zoning, utilities, foundations, engineering, permits, and inspections.",
}: CmhcFeatureProps) {
  return (
    <section
      id="cmhc"
      aria-labelledby="cmhc-heading"
      className="scroll-mt-20 bg-[#0B0C10] px-5 py-24 sm:px-8 sm:py-28 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-10 border-b border-white/10 pb-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20 lg:pb-20">
          <div>
            <p className="eyebrow">CMHC pre-approved designs</p>
            <div
              className="mt-10 flex size-16 items-center justify-center border border-white/25"
              aria-hidden="true"
            >
              <BadgeCheck size={27} strokeWidth={1.25} />
            </div>
          </div>
          <div>
            <HeadlineReveal variant="sweep">
              <h2
                id="cmhc-heading"
                className="max-w-5xl text-[clamp(3rem,6vw,6.8rem)] font-medium leading-[0.9] tracking-[-0.065em]"
              >
                {headlinePrimary}
                <br />
                <span className="text-white/38">{headlineSecondary}</span>
              </h2>
            </HeadlineReveal>
            <p className="mt-8 max-w-2xl text-base leading-7 text-white/52 lg:text-lg lg:leading-8">
              {supportingCopy}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 md:gap-12 lg:grid-cols-12">
          <article className="relative flex min-h-[490px] flex-col justify-between overflow-hidden border border-white/10 bg-[#0B0C10] p-7 text-white sm:p-8 lg:col-span-7 lg:row-span-3 lg:min-h-[620px]">
            <div
              className="absolute -right-16 -top-14 size-72 rounded-full border border-white/10 sm:size-96"
              aria-hidden="true"
            />
            <div className="relative flex items-start justify-between gap-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                Canada Housing Design Catalogue
              </p>
              <MapPinned size={23} strokeWidth={1.25} aria-hidden="true" />
            </div>

            <div className="relative">
              <p className="text-[clamp(5.2rem,12vw,12rem)] font-medium leading-[0.74] tracking-[-0.085em]">
                CMHC
              </p>
              <div className="mt-12 grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-2">
                <h3 className="max-w-md text-3xl font-medium leading-[1.02] tracking-[-0.05em] sm:text-4xl">
                  A proven baseline for faster housing delivery.
                </h3>
                <p className="max-w-sm text-sm leading-6 text-white/57">
                  Catalogue designs establish a consistent starting point.
                  House Delivery Inc. turns that baseline into a locally coordinated,
                  buildable project.
                </p>
              </div>
            </div>
          </article>

          {advantages.map((advantage) => {
            const Icon = advantage.icon;

            return (
              <article
                key={advantage.number}
                className="group flex min-h-[196px] flex-col justify-between border border-white/10 bg-[#0B0C10] p-7 transition-colors duration-500 hover:border-white/25 sm:p-8 lg:col-span-5"
              >
                <div className="flex items-start justify-between gap-8">
                  <span className="text-[9px] font-semibold tracking-[0.2em] text-white/28">
                    {advantage.number}
                  </span>
                  <Icon
                    size={22}
                    strokeWidth={1.25}
                    className="text-white/42 transition-colors group-hover:text-white"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-10">
                  <h3 className="text-2xl font-medium tracking-[-0.04em]">
                    {advantage.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/46">
                    {advantage.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
