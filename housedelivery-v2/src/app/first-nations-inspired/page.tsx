import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FirstNationsModelGallery } from "@/components/first-nations-model-gallery";
import { HeadlineReveal } from "@/components/headline-reveal";
import { RevealText } from "@/components/reveal-text";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteHeader } from "@/components/site-header";
import { StaggeredText } from "@/components/staggered-text";

export const metadata: Metadata = {
  title: "First Nations Inspired Designs",
  description:
    "Nation-led housing design shaped around community ownership, cultural context, resilient light steel framing, and local delivery priorities.",
};

const leadStudy = {
  number: "02",
  src: "/Langley-1.png",
  alt: "Exterior rendering of The Langley catalog home model",
  label: "Langley / Arrival",
  detail: "A generous threshold",
} as const;

const galleryModels = [
  {
    number: "03",
    name: "Boreal",
    src: "/Boreal-1.png",
    alt: "Exterior rendering of The Boreal catalog home model",
    placement: "lg:col-span-2 xl:col-span-3",
  },
  {
    number: "04",
    name: "Canmore",
    src: "/Canmore-1.png",
    alt: "Exterior rendering of the Canmore catalog home model",
    placement: "lg:col-span-2 xl:col-span-3",
  },
  {
    number: "05",
    name: "Cedarview",
    src: "/Cedarview-1.png",
    alt: "Exterior rendering of The Cedarview catalog home model",
    placement: "lg:col-span-2 xl:col-span-3",
  },
  {
    number: "06",
    name: "Solace",
    src: "/Solace-1.png",
    alt: "Exterior rendering of the Solace catalog home model",
    placement: "lg:col-span-2 xl:col-span-3",
  },
  {
    number: "07",
    name: "Timberline",
    src: "/Timberline-1.png",
    alt: "Exterior rendering of The Timberline catalog home model",
    placement: "lg:col-span-2 xl:col-span-3",
  },
  {
    number: "08",
    name: "Meridian",
    src: "/Meridian-1.png",
    alt: "Exterior rendering of The Meridian catalog home model",
    placement: "lg:col-span-2 xl:col-span-3",
  },
  {
    number: "09",
    name: "Cascade",
    src: "/Cascade-1.png",
    alt: "Exterior rendering of The Cascade catalog home model",
    placement: "lg:col-span-2 xl:col-span-3",
  },
  {
    number: "10",
    name: "Apex",
    src: "/Apex-1.png",
    alt: "Exterior rendering of The Apex catalog home model",
    placement: "lg:col-span-2 xl:col-span-3",
  },
  {
    number: "11",
    name: "Aurora",
    src: "/Aurora-1.png",
    alt: "Exterior rendering of The Aurora catalog home model",
    placement: "lg:col-span-2 xl:col-span-4",
  },
  {
    number: "12",
    name: "Dalton",
    src: "/Dalton-1.png",
    alt: "Exterior rendering of The Dalton catalog home model",
    placement: "lg:col-span-3 xl:col-span-4",
  },
  {
    number: "13",
    name: "Southbay",
    src: "/Southbay-1.png",
    alt: "Exterior rendering of The Southbay catalog home model",
    placement: "col-span-2 lg:col-span-3 xl:col-span-4",
  },
] as const;

const heroIntroSegments = [
  "Built with Nations.",
  "Rooted in place.",
  "Designed for ownership that stays in community.",
] as const;

const platformDescriptionSegments = [
  "Our pre-engineered steel-frame models provide the high-performance structural canvas.",
  "Explore our core base platforms, then work with our team and local artisans to apply custom design treatments.",
] as const;

const principles = [
  {
    number: "01",
    title: "Community ownership",
    body: "Homes that build local capacity. Neighbourhoods that keep value, pride, and possibility close.",
  },
  {
    number: "02",
    title: "Cultural context",
    body: "Gathering, privacy, multigenerational life, and connection to land—translated through each Nation’s priorities.",
  },
  {
    number: "03",
    title: "Resilient structure",
    body: "Precision light steel, adapted for local snow, wind, seismic conditions, and a long service life.",
  },
  {
    number: "04",
    title: "Local integration",
    body: "Band leadership, housing teams, site realities, servicing, and local participation aligned from the beginning.",
  },
] as const;

export default function FirstNationsInspiredPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#0B0C10] text-white">
        <section className="px-5 pt-36 pb-24 sm:px-8 sm:pt-44 lg:px-12 lg:pt-52 lg:pb-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
              <ScrollReveal
                className="col-span-12 lg:col-span-3"
                variant="fade"
              >
                <p className="eyebrow">Nation-led / Place-specific</p>
              </ScrollReveal>

              <HeadlineReveal className="col-span-12 lg:col-span-9 lg:col-start-4">
                <h1 className="max-w-6xl text-[clamp(2.5rem,5vw,6rem)] font-medium leading-[0.86] tracking-[-0.07em] text-white/90">
                  First Nations
                  <br />
                  <span className="text-white/40">Inspired Designs</span>
                </h1>
              </HeadlineReveal>

              <StaggeredText
                segments={heroIntroSegments}
                delay={0.12}
                className="col-span-11 max-w-2xl text-xl leading-8 tracking-[-0.02em] text-white/70 sm:col-span-8 sm:col-start-4 lg:col-span-5 lg:col-start-8 lg:text-2xl lg:leading-9"
              />
            </div>

            <ScrollReveal
              className="mt-20 lg:mt-28"
              delay={0.2}
              variant="fade"
            >
              <figure className="group">
                <div className="relative aspect-[2/1] overflow-hidden border border-white/10 bg-white/[0.035]">
                  <Image
                    src="/First Nations 1.webp"
                    alt="Timber-framed gathering room overlooking a forested Pacific coastline"
                    fill
                    priority
                    quality={100}
                    unoptimized={true}
                    sizes="100vw"
                    className="object-cover grayscale mix-blend-luminosity transition-all duration-700 group-hover:scale-[1.015] group-hover:grayscale-0 group-hover:mix-blend-normal render-crisp"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                  <div className="absolute right-5 bottom-5 left-5 flex items-end justify-between gap-6 text-[9px] uppercase tracking-[0.22em] text-white/65 sm:right-8 sm:bottom-8 sm:left-8">
                    <span>01 / 13</span>
                    <span className="text-right">
                      Gathering / Land in view
                    </span>
                  </div>
                </div>
              </figure>
            </ScrollReveal>
          </div>
        </section>

        <section className="px-5 py-32 sm:px-8 lg:px-12 lg:py-44">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-14 border-t border-white/10 pt-8 lg:gap-x-8">
              <ScrollReveal
                className="col-span-12 lg:col-span-3"
                variant="fade"
              >
                <p className="eyebrow">The starting point</p>
              </ScrollReveal>
              <h2 className="col-span-12 max-w-5xl text-[clamp(2.8rem,6vw,6.8rem)] font-medium leading-[0.86] tracking-[-0.07em] text-white/90 lg:col-span-8 lg:col-start-4">
                <RevealText text="Listen first." />
                <br />
                <span className="text-white/38">
                  <RevealText text="Then draw." delay={0.12} />
                </span>
              </h2>
              <div className="col-span-10 col-start-3 max-w-xl border-l border-white/10 pl-6 text-base leading-7 text-white/70 sm:col-span-7 sm:col-start-6 lg:col-span-4 lg:col-start-9 lg:text-lg lg:leading-8">
                <ScrollReveal variant="fade" clip={false}>
                  <p>
                    Inspiration is not applied decoration. It begins with local
                    knowledge, cultural priorities, land, climate, and the way a
                    community gathers.
                  </p>
                </ScrollReveal>
                <ScrollReveal
                  className="mt-6"
                  delay={0.12}
                  variant="fade"
                  clip={false}
                >
                  <p className="text-white/50">
                    We work directly with Bands, Nations, housing managers, and
                    local teams to adapt each architectural system around that
                    context.
                  </p>
                </ScrollReveal>
              </div>
            </div>

            <ScrollReveal
              className="mt-28 lg:mt-40 lg:w-2/3"
              variant="fade"
            >
              <figure className="group">
                <div className="relative aspect-[2/1] overflow-hidden border border-white/10 bg-white/[0.035]">
                  <Image
                    src={leadStudy.src}
                    alt={leadStudy.alt}
                    fill
                    quality={100}
                    unoptimized={true}
                    sizes="(min-width: 1024px) 66vw, 100vw"
                    className="object-cover grayscale transition-all duration-500 hover:scale-[1.015] hover:grayscale-0 render-crisp"
                  />
                </div>
                <figcaption className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.2em] text-white/35">
                  <span>{leadStudy.number} / 13</span>
                  <span>{leadStudy.label}</span>
                  <span className="text-right">{leadStudy.detail}</span>
                </figcaption>
              </figure>
            </ScrollReveal>

            <ScrollReveal
              className="mt-28 lg:mt-44"
              variant="scale"
              clip={false}
            >
              <div className="grid grid-cols-12 gap-y-8 border-y border-white/10 py-10 lg:gap-x-8 lg:py-14">
                <p className="eyebrow col-span-12 lg:col-span-3">
                  Authenticity / Partnership
                </p>
                <p className="col-span-12 max-w-5xl text-[clamp(1.6rem,2.8vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.045em] lg:col-span-9 lg:col-start-4">
                  <span className="text-white/95">
                    Authentic Collaboration:
                  </span>{" "}
                  <span className="text-white/50">
                    Our factory-built structural systems serve as a
                    high-performance canvas. All specialized First Nations
                    design treatments, traditional architectural elements, and
                    custom artistic installations are completed directly in
                    partnership with highly regarded local First Nations
                    carvers, artists, and community trades.
                  </span>
                </p>
              </div>
            </ScrollReveal>

            <FirstNationsModelGallery models={galleryModels} />

            <div className="mt-24 grid grid-cols-12 gap-y-8 border-y border-white/10 py-10 lg:mt-32 lg:gap-x-8 lg:py-14">
              <ScrollReveal
                className="col-span-12 lg:col-span-3"
                variant="fade"
              >
                <p className="eyebrow">
                  Cultural expression / Structural certainty
                </p>
              </ScrollReveal>
              <div className="col-span-12 lg:col-span-9 lg:col-start-4">
                <HeadlineReveal variant="sweep">
                  <h3 className="max-w-4xl text-[clamp(2.25rem,4.3vw,5rem)] font-medium leading-[0.92] tracking-[-0.06em] text-white/90">
                    One Platform.
                    <br />
                    <span className="text-white/42">
                      Unlimited Cultural Expressions.
                    </span>
                  </h3>
                </HeadlineReveal>
                <StaggeredText
                  segments={platformDescriptionSegments}
                  delay={0.12}
                  className="mt-7 max-w-3xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8"
                />
                <ScrollReveal
                  className="mt-9"
                  delay={0.2}
                  variant="fade"
                  clip={false}
                >
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <Link
                      href="/#homes"
                      className="group inline-flex items-center justify-between gap-5 bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B0C10] transition-colors duration-300 hover:bg-white/80 sm:justify-start"
                    >
                      Explore Core Base Platforms
                      <ArrowUpRight
                        aria-hidden="true"
                        size={14}
                        className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </Link>
                    <Link
                      href="/#reserve"
                      className="group inline-flex items-center justify-between gap-5 border border-white/25 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 transition-colors duration-300 hover:border-white/60 hover:bg-white hover:text-[#0B0C10] sm:justify-start"
                    >
                      Begin Project Review
                      <ArrowUpRight
                        aria-hidden="true"
                        size={14}
                        className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
              <ScrollReveal
                className="col-span-12 lg:col-span-3"
                variant="fade"
              >
                <p className="eyebrow">One system / Many expressions</p>
              </ScrollReveal>
              <h2 className="col-span-12 max-w-5xl text-[clamp(3rem,6.4vw,7rem)] font-medium leading-[0.84] tracking-[-0.07em] text-white/90 lg:col-span-8 lg:col-start-4">
                <RevealText text="The architecture adapts." />
                <br />
                <span className="text-white/38">
                  <RevealText
                    text="The purpose stays clear."
                    delay={0.12}
                  />
                </span>
              </h2>
            </div>

            <div className="mt-24 border-t border-white/10 lg:mt-32">
              {principles.map((principle, index) => (
                <ScrollReveal
                  key={principle.number}
                  delay={index * 0.08}
                  variant="fade"
                  clip={false}
                >
                  <article className="grid grid-cols-12 gap-y-7 border-b border-white/10 py-10 lg:gap-x-8 lg:py-14">
                    <span className="col-span-2 text-[10px] tracking-[0.2em] text-white/30 lg:col-span-1">
                      {principle.number}
                    </span>
                    <h3 className="col-span-10 text-[clamp(2rem,4vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.06em] text-white/90 lg:col-span-4 lg:col-start-3">
                      {principle.title}
                    </h3>
                    <p className="col-span-10 col-start-3 max-w-xl text-base leading-7 text-white/70 lg:col-span-4 lg:col-start-8 lg:self-end lg:text-lg lg:leading-8">
                      {principle.body}
                    </p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="reserve"
          className="scroll-mt-24 border-t border-white/10 px-5 py-28 sm:px-8 lg:px-12 lg:py-44"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-14 lg:gap-x-8">
              <ScrollReveal
                className="col-span-12 lg:col-span-3"
                variant="fade"
              >
                <p className="eyebrow">Community leaders / Housing teams</p>
              </ScrollReveal>
              <div className="col-span-12 lg:col-span-8 lg:col-start-4">
                <HeadlineReveal variant="sweep">
                  <h2 className="max-w-6xl text-[clamp(3.4rem,7vw,8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90">
                    Bring the land.
                    <br />
                    <span className="text-white/38">
                      Bring the community.
                    </span>
                  </h2>
                </HeadlineReveal>
                <div className="mt-12 flex flex-col items-start gap-8 border-t border-white/10 pt-8 sm:flex-row sm:items-end sm:justify-between">
                  <ScrollReveal variant="fade" clip={false}>
                    <p className="max-w-xl text-lg leading-8 text-white/70">
                      We&apos;ll shape the housing path together—design,
                      delivery, funding context, and local priorities aligned
                      from day one.
                    </p>
                  </ScrollReveal>
                  <ScrollReveal
                    delay={0.12}
                    variant="fade"
                    clip={false}
                  >
                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                      <Link
                        href="/first-nations-project-planner"
                        className="group inline-flex shrink-0 items-center justify-between gap-5 bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0b0c10] transition-colors hover:bg-white/82"
                      >
                        Plan a housing portfolio
                        <ArrowUpRight
                          aria-hidden="true"
                          size={14}
                          className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </Link>
                      <Link
                        href="/#reserve"
                        className="group inline-flex shrink-0 items-center justify-between gap-5 border border-white/25 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 transition-colors hover:border-white"
                      >
                        Begin project review
                        <ArrowUpRight
                          aria-hidden="true"
                          size={14}
                          className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </Link>
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
