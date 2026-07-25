import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "First Nations Inspired Designs",
  description:
    "Nation-led housing design shaped around community ownership, cultural context, resilient light steel framing, and local delivery priorities.",
};

const designStudies = [
  {
    number: "02",
    src: "/First Nations 2.webp",
    alt: "Timber-clad home with carved architectural columns set against a forested mountain landscape",
    label: "Identity / Arrival",
    detail: "Culture held in form",
    placement: "lg:col-span-8",
    sizes: "(min-width: 1024px) 66vw, 100vw",
  },
  {
    number: "03",
    src: "/First Nations 3.webp",
    alt: "Timber-framed gathering room opening toward a rugged Pacific coastline",
    label: "Gathering / Outlook",
    detail: "The land drawn inward",
    placement: "lg:col-span-5 lg:col-start-8 lg:mt-32",
    sizes: "(min-width: 1024px) 42vw, 100vw",
  },
  {
    number: "04",
    src: "/First Nations 4.webp",
    alt: "Contemporary coastal home at dusk beside a forested shoreline",
    label: "Place / Shelter",
    detail: "A quieter horizon",
    placement: "lg:col-span-5 lg:col-start-2 lg:mt-24",
    sizes: "(min-width: 1024px) 42vw, 100vw",
  },
  {
    number: "05",
    src: "/First Nations 5.webp",
    alt: "Light-filled timber-framed kitchen overlooking the Pacific coast",
    label: "Kitchen / Kinship",
    detail: "Made for gathering",
    placement: "lg:col-span-6 lg:col-start-7 lg:mt-44",
    sizes: "(min-width: 1024px) 50vw, 100vw",
  },
  {
    number: "06",
    src: "/First Nations 6.webp",
    alt: "Woodland home with timber siding, metal roofing, and carved cultural details",
    label: "Home / Continuity",
    detail: "Built to remain",
    placement: "lg:col-span-10 lg:col-start-2 lg:mt-32",
    sizes: "(min-width: 1024px) 84vw, 100vw",
  },
  {
    number: "07",
    src: "/First Nations 7.webp",
    alt: "Warm timber kitchen and gathering space framed by a dramatic ocean view",
    label: "Table / Belonging",
    detail: "Life held in common",
    placement: "lg:col-span-5 lg:mt-36",
    sizes: "(min-width: 1024px) 42vw, 100vw",
  },
  {
    number: "08",
    src: "/First Nations 8.webp",
    alt: "White coastal kitchen with carved timber cabinetry and expansive glazing",
    label: "Craft / Light",
    detail: "Tradition, made contemporary",
    placement: "lg:col-span-7 lg:col-start-6 lg:mt-20",
    sizes: "(min-width: 1024px) 58vw, 100vw",
  },
  {
    number: "09",
    src: "/First Nations 9.webp",
    alt: "Contemporary timber and stone coastal home illuminated at blue hour",
    label: "Resilience / Land",
    detail: "Strength without noise",
    placement: "lg:col-span-7 lg:mt-36",
    sizes: "(min-width: 1024px) 58vw, 100vw",
  },
  {
    number: "10",
    src: "/First Nations 10.webp",
    alt: "Vaulted white timber kitchen overlooking a forested Pacific shoreline",
    label: "Future / Ownership",
    detail: "A legacy in place",
    placement: "lg:col-span-5 lg:col-start-8 lg:mt-20",
    sizes: "(min-width: 1024px) 42vw, 100vw",
  },
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
              <p className="eyebrow col-span-12 lg:col-span-3">
                Nation-led / Place-specific
              </p>

              <div className="col-span-12 lg:col-span-9 lg:col-start-4">
                <h1 className="max-w-6xl text-[clamp(2.5rem,5vw,6rem)] font-medium leading-[0.86] tracking-[-0.07em] text-white/90">
                  First Nations
                  <br />
                  <span className="text-white/40">Inspired Designs</span>
                </h1>
              </div>

              <p className="col-span-11 max-w-2xl text-xl leading-8 tracking-[-0.02em] text-white/70 sm:col-span-8 sm:col-start-4 lg:col-span-5 lg:col-start-8 lg:text-2xl lg:leading-9">
                Built with Nations. Rooted in place. Designed for ownership that
                stays in community.
              </p>
            </div>

            <figure className="group mt-20 lg:mt-28">
              <div className="relative aspect-[2/1] overflow-hidden border border-white/10 bg-white/[0.035]">
                <Image
                  src="/First Nations 1.webp"
                  alt="Timber-framed gathering room overlooking a forested Pacific coastline"
                  fill
                  priority
                  quality={100}
                  unoptimized={true}
                  sizes="100vw"
                  className="object-cover grayscale mix-blend-luminosity transition-all duration-700 group-hover:scale-[1.015] group-hover:grayscale-0 group-hover:mix-blend-normal"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                <div className="absolute right-5 bottom-5 left-5 flex items-end justify-between gap-6 text-[9px] uppercase tracking-[0.22em] text-white/65 sm:right-8 sm:bottom-8 sm:left-8">
                  <span>01 / 10</span>
                  <span className="text-right">
                    Gathering / Land in view
                  </span>
                </div>
              </div>
            </figure>
          </div>
        </section>

        <section className="px-5 py-32 sm:px-8 lg:px-12 lg:py-44">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-14 border-t border-white/10 pt-8 lg:gap-x-8">
              <p className="eyebrow col-span-12 lg:col-span-3">
                The starting point
              </p>
              <h2 className="col-span-12 max-w-5xl text-[clamp(2.8rem,6vw,6.8rem)] font-medium leading-[0.86] tracking-[-0.07em] text-white/90 lg:col-span-8 lg:col-start-4">
                Listen first.
                <br />
                <span className="text-white/38">Then draw.</span>
              </h2>
              <div className="col-span-10 col-start-3 max-w-xl border-l border-white/10 pl-6 text-base leading-7 text-white/70 sm:col-span-7 sm:col-start-6 lg:col-span-4 lg:col-start-9 lg:text-lg lg:leading-8">
                <p>
                  Inspiration is not applied decoration. It begins with local
                  knowledge, cultural priorities, land, climate, and the way a
                  community gathers.
                </p>
                <p className="mt-6 text-white/50">
                  We work directly with Bands, Nations, housing managers, and
                  local teams to adapt each architectural system around that
                  context.
                </p>
              </div>
            </div>

            <div className="mt-28 grid grid-cols-12 gap-x-4 gap-y-24 lg:mt-40 lg:gap-y-0">
              {designStudies.map((study) => (
                <figure
                  key={study.number}
                  className={`group col-span-12 ${study.placement}`}
                >
                  <div className="relative aspect-[2/1] overflow-hidden border border-white/10 bg-white/[0.035]">
                    <Image
                      src={study.src}
                      alt={study.alt}
                      fill
                      quality={100}
                      unoptimized={true}
                      sizes={study.sizes}
                      className="object-cover grayscale mix-blend-luminosity transition-all duration-700 group-hover:scale-[1.015] group-hover:grayscale-0 group-hover:mix-blend-normal"
                    />
                  </div>
                  <figcaption className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.2em] text-white/35">
                    <span>{study.number} / 10</span>
                    <span>{study.label}</span>
                    <span className="text-right">{study.detail}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
              <p className="eyebrow col-span-12 lg:col-span-3">
                One system / Many expressions
              </p>
              <h2 className="col-span-12 max-w-5xl text-[clamp(3rem,6.4vw,7rem)] font-medium leading-[0.84] tracking-[-0.07em] text-white/90 lg:col-span-8 lg:col-start-4">
                The architecture adapts.
                <br />
                <span className="text-white/38">The purpose stays clear.</span>
              </h2>
            </div>

            <div className="mt-24 border-t border-white/10 lg:mt-32">
              {principles.map((principle) => (
                <article
                  key={principle.number}
                  className="grid grid-cols-12 gap-y-7 border-b border-white/10 py-10 lg:gap-x-8 lg:py-14"
                >
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
              <p className="eyebrow col-span-12 lg:col-span-3">
                Community leaders / Housing teams
              </p>
              <div className="col-span-12 lg:col-span-8 lg:col-start-4">
                <h2 className="max-w-6xl text-[clamp(3.4rem,7vw,8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90">
                  Bring the land.
                  <br />
                  <span className="text-white/38">
                    Bring the community.
                  </span>
                </h2>
                <div className="mt-12 flex flex-col items-start gap-8 border-t border-white/10 pt-8 sm:flex-row sm:items-end sm:justify-between">
                  <p className="max-w-xl text-lg leading-8 text-white/70">
                    We&apos;ll shape the housing path together—design, delivery,
                    funding context, and local priorities aligned from day one.
                  </p>
                  <Link
                    href="/#reserve"
                    className="group inline-flex shrink-0 items-center gap-5 border-b border-white pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 transition-colors hover:text-white"
                  >
                    Begin project review
                    <ArrowUpRight
                      aria-hidden="true"
                      size={14}
                      className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
