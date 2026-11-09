import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FirstNationsModelGallery } from "@/components/first-nations-model-gallery";
import { HeadlineReveal } from "@/components/headline-reveal";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "First Nations Housing | House Delivery",
  description:
    "Explore a coordinated housing pathway for First Nations communities, from home selection and design through project planning, local participation and delivery.",
};

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

const principles = [
  {
    number: "01",
    title: "Housing need first",
    body: "Start with the number of homes, the site, timing and the community priorities you already know.",
  },
  {
    number: "02",
    title: "Choose the right homes",
    body: "Build a housing mix from House Delivery models and adapt the project around local requirements.",
  },
  {
    number: "03",
    title: "Design with the Nation",
    body: "Cultural expression, gathering, privacy, multigenerational living and local design priorities are developed with the community.",
  },
  {
    number: "04",
    title: "Build local capacity",
    body: "Projects can support local participation and assembly training so skills and experience remain in the community.",
  },
] as const;

export default function FirstNationsInspiredPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#0B0C10] text-white">
        <section className="px-5 pb-24 pt-36 sm:px-8 sm:pt-44 lg:px-12 lg:pb-36 lg:pt-52">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
              <ScrollReveal className="col-span-12 lg:col-span-3" variant="fade">
                <p className="eyebrow">First Nations Housing</p>
              </ScrollReveal>

              <HeadlineReveal className="col-span-12 lg:col-span-9 lg:col-start-4">
                <h1 className="max-w-6xl text-[clamp(3.2rem,7vw,8rem)] font-medium leading-[0.84] tracking-[-0.075em] text-white/92">
                  Housing shaped
                  <br />
                  <span className="text-white/38">with the community.</span>
                </h1>
              </HeadlineReveal>

              <p className="col-span-11 max-w-2xl text-xl leading-8 tracking-[-0.02em] text-white/68 sm:col-span-8 sm:col-start-4 lg:col-span-5 lg:col-start-8 lg:text-2xl lg:leading-9">
                Start with the housing need. Choose the homes. Define the design direction. Build a project around the Nation&apos;s land, priorities and people.
              </p>
            </div>

            <figure className="mt-20 lg:mt-28">
              <div className="relative aspect-[2/1] overflow-hidden border border-white/10 bg-white/[0.035]">
                <Image
                  src="/First Nations 1.webp"
                  alt="Gathering room overlooking a forested Pacific coastline"
                  fill
                  priority
                  quality={100}
                  unoptimized
                  sizes="100vw"
                  className="object-cover render-crisp"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
              </div>
            </figure>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/plan-a-housing-project"
                className="group inline-flex items-center justify-between gap-5 bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B0C10] transition-colors hover:bg-white/82"
              >
                Plan a Housing Project
                <ArrowUpRight
                  aria-hidden="true"
                  size={14}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/#homes"
                className="group inline-flex items-center justify-between gap-5 border border-white/25 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 transition-colors hover:border-white"
              >
                Explore Homes
                <ArrowUpRight
                  aria-hidden="true"
                  size={14}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
              <p className="eyebrow">How the project starts</p>
              <div>
                <h2 className="max-w-5xl text-[clamp(3rem,6vw,6.5rem)] font-medium leading-[0.88] tracking-[-0.068em] text-white/90">
                  Start with what
                  <br />
                  <span className="text-white/38">you know today.</span>
                </h2>
                <p className="mt-8 max-w-2xl text-base leading-8 text-white/54">
                  A project can begin before every technical answer is known. The Planner helps organize housing need, home selection, design direction, readiness and funding opportunities into one project record.
                </p>
              </div>
            </div>

            <div className="mt-16 border-t border-white/10 lg:mt-24">
              {principles.map((principle, index) => (
                <ScrollReveal
                  key={principle.number}
                  delay={index * 0.06}
                  variant="fade"
                  clip={false}
                >
                  <article className="grid grid-cols-12 gap-y-6 border-b border-white/10 py-9 lg:gap-x-8 lg:py-12">
                    <span className="col-span-2 font-mono text-[9px] tracking-[0.18em] text-white/28 lg:col-span-1">
                      {principle.number}
                    </span>
                    <h3 className="col-span-10 text-[clamp(1.8rem,3vw,3.5rem)] font-medium leading-[0.92] tracking-[-0.055em] text-white/88 lg:col-span-4 lg:col-start-3">
                      {principle.title}
                    </h3>
                    <p className="col-span-10 col-start-3 max-w-xl text-sm leading-7 text-white/52 lg:col-span-4 lg:col-start-8 lg:self-end lg:text-base lg:leading-8">
                      {principle.body}
                    </p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-10 border-t border-white/10 pt-8 lg:gap-x-8">
              <p className="eyebrow col-span-12 lg:col-span-3">Architecture + cultural expression</p>
              <div className="col-span-12 lg:col-span-9 lg:col-start-4">
                <h2 className="max-w-5xl text-[clamp(3rem,6vw,6.5rem)] font-medium leading-[0.88] tracking-[-0.068em] text-white/90">
                  A proven structural platform.
                  <br />
                  <span className="text-white/38">A place-specific result.</span>
                </h2>
                <p className="mt-8 max-w-3xl text-base leading-8 text-white/54">
                  House Delivery homes provide the structural and architectural starting point. Cultural treatments, local materials, artwork and community-specific design decisions are developed with the Nation and its chosen local partners.
                </p>
              </div>
            </div>

            <div className="mt-16 lg:mt-24">
              <FirstNationsModelGallery models={galleryModels} />
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#0d0f13] px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end lg:gap-20">
              <p className="eyebrow">Local participation</p>
              <div>
                <h2 className="max-w-5xl text-[clamp(3rem,6vw,6.5rem)] font-medium leading-[0.88] tracking-[-0.068em] text-white/90">
                  Build homes.
                  <br />
                  <span className="text-white/38">Build capacity.</span>
                </h2>
                <p className="mt-8 max-w-3xl text-base leading-8 text-white/54">
                  Where appropriate, House Delivery can support community participation in assembly and training so local teams gain practical experience that can carry into future housing projects.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="reserve" className="scroll-mt-24 border-t border-white/10 px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">Ready to explore the project?</p>
                <HeadlineReveal variant="sweep" className="mt-7">
                  <h2 className="max-w-6xl text-[clamp(3.4rem,7vw,8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90">
                    Plan the housing need.
                    <br />
                    <span className="text-white/38">We&apos;ll help organize the path.</span>
                  </h2>
                </HeadlineReveal>
              </div>
              <Link
                href="/plan-a-housing-project"
                className="group inline-flex min-h-14 items-center justify-between gap-10 bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0B0C10] transition-colors hover:bg-white/82"
              >
                Plan a Housing Project
                <ArrowUpRight
                  aria-hidden="true"
                  size={14}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
