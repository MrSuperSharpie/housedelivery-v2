import {
  ArrowUpRight,
  BadgeCheck,
  FileCheck2,
  Landmark,
  Layers3,
  MapPinned,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import { PortfolioCategoryNav } from "@/components/portfolio-category-nav";
import { catalogModels } from "@/data/catalog";

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

export function CmhcFeature() {
  return (
    <section
      id="cmhc"
      aria-labelledby="cmhc-heading"
      className="scroll-mt-20 bg-[#0B0C10] px-5 pb-28 sm:px-8 lg:px-12 lg:pb-40"
    >
      <div className="mx-auto max-w-[1504px]">
        <PortfolioCategoryNav active="pre-approved" />

        <div className="mt-16 grid gap-10 border-b border-white/10 pb-14 lg:mt-24 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20 lg:pb-20">
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
                Standardized by design.
                <br />
                <span className="text-white/38">
                  Site-ready by adaptation.
                </span>
              </h2>
            </HeadlineReveal>
            <p className="mt-8 max-w-2xl text-base leading-7 text-white/52 lg:text-lg lg:leading-8">
              Standardized designs can create a faster route to a site-specific
              answer. House Delivery Inc. uses Canada&apos;s Housing Design
              Catalogue as a proven starting point, then coordinates the
              site-specific work: zoning, utilities, foundations, engineering,
              permits, and inspections.
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

        <div className="mt-24 border-t border-white/10 pt-12 lg:mt-36 lg:pt-16">
          <div className="mb-12 grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
            <div>
              <p className="eyebrow">Pre-approved catalogue</p>
              <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-white/28">
                07 regional housing systems
              </p>
            </div>
            <div>
              <h3 className="max-w-4xl text-[clamp(2.5rem,4.7vw,5.2rem)] font-medium leading-[0.94] tracking-[-0.06em]">
                Proven housing types,
                <br />
                <span className="text-white/38">ready for local adaptation.</span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-3">
            {catalogModels.map((model) => (
              <article
                key={model.code}
                className="group relative flex min-h-[620px] flex-col justify-between overflow-hidden border border-white/10 bg-[#0B0C10] p-7 transition-colors duration-500 hover:border-white/25 sm:p-8"
              >
                <Link
                  href={`/catalog/${model.slug}`}
                  aria-label={`View details for ${model.name}`}
                  className="absolute inset-0 z-10"
                >
                  <span className="sr-only">View {model.name} details</span>
                </Link>

                <span
                  className="pointer-events-none absolute -right-3 top-0 text-[clamp(8rem,16vw,13rem)] font-medium leading-none tracking-[-0.08em] text-white/[0.025] transition-colors duration-300 group-hover:text-white/[0.045]"
                  aria-hidden="true"
                >
                  {model.number}
                </span>

                <div className="relative -mx-7 -mt-7 aspect-[16/10] overflow-hidden border-b border-white/10 bg-[#13151a] sm:-mx-8 sm:-mt-8">
                  <Image
                    src={model.image}
                    alt={model.imageAlt}
                    fill
                    quality={100}
                    unoptimized={true}
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                    className="object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.04] hover:brightness-100 group-hover:scale-[1.04] group-hover:brightness-100"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e1014]/35 via-transparent to-black/5"
                    aria-hidden="true"
                  />
                </div>

                <div className="relative mt-7 flex items-start justify-between gap-8">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/34">
                    {model.code}
                  </p>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/22">
                    {model.squareFootage} sq ft
                  </span>
                </div>

                <div className="relative mt-20">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    {model.purpose}
                  </p>
                  <h4 className="mt-5 max-w-lg text-[clamp(2rem,3vw,3.25rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/90">
                    {model.name}
                  </h4>
                  <p className="mt-6 max-w-md text-sm leading-6 text-white/46">
                    {model.description}
                  </p>
                </div>

                <div className="relative z-20 mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-7">
                  <Link
                    href={`/catalog/${model.slug}`}
                    aria-label={`View details for ${model.name}`}
                    className="inline-flex items-center gap-4 border border-white/28 px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-colors hover:border-white/60 hover:text-white"
                  >
                    View Details
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                  <a
                    href={model.downloadHref}
                    download
                    aria-label={`Download PDF drawings and specifications for ${model.name}`}
                    className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/52 transition-colors hover:text-white"
                  >
                    Download PDF
                  </a>
                </div>
              </article>
            ))}
          </div>

        </div>

        <div className="mt-3 border border-[#1f2833] bg-[#0e1014]">
          <div className="grid border-b border-[#1f2833] sm:grid-cols-3">
            <div className="p-7 sm:border-r sm:border-[#1f2833] sm:p-9">
              <p className="text-4xl font-medium tracking-[-0.055em]">
                540 <span className="text-lg text-white/34">sq ft</span>
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-white/35">
                BC ADU-01
              </p>
            </div>
            <div className="border-t border-[#1f2833] p-7 sm:border-r sm:border-t-0 sm:p-9">
              <p className="text-4xl font-medium tracking-[-0.055em]">
                750 <span className="text-lg text-white/34">sq ft</span>
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-white/35">
                BC ADU-02
              </p>
            </div>
            <div className="border-t border-[#1f2833] p-7 sm:border-t-0 sm:p-9">
              <p className="text-4xl font-medium tracking-[-0.055em]">
                07 <span className="text-lg text-white/34">typologies</span>
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-white/35">
                BC catalogue range
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-7 sm:p-9">
            {catalogModels.map((model) => (
              <a
                key={model.code}
                href={model.downloadHref}
                download
                aria-label={`Download PDF drawings for ${model.name}`}
                className="border border-white/14 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/52 transition-colors hover:border-white/35 hover:text-white/90"
              >
                {model.catalogLabel}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-6 text-white/38 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-3xl">
            Catalogue designs are presented for planning and reference. Local
            zoning, site conditions, engineering, permitting, inspections, and
            lender approval still apply.
          </p>
        </div>
      </div>
    </section>
  );
}
