import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  catalogModels,
  type CatalogModel,
} from "@/data/catalog";

type CatalogueModelGridProps = {
  models: readonly CatalogModel[];
};

function CatalogueModelGrid({ models }: CatalogueModelGridProps) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-3">
      {models.map((model) => (
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
              quality={90}
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1599px) 33vw, 488px"
              style={{ imageRendering: "auto" }}
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
            <h3 className="mt-5 max-w-lg text-[clamp(2rem,3vw,3.25rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/90">
              {model.name}
            </h3>
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
  );
}

type PreApprovedShowcaseProps = {
  catalogueFollowOn?: ReactNode;
};

export function PreApprovedShowcase({
  catalogueFollowOn,
}: PreApprovedShowcaseProps) {
  return (
    <section
      id="pre-approved-homes"
      aria-labelledby="pre-approved-homes-heading"
      className="scroll-mt-20 bg-[#0B0C10] px-5 pb-24 pt-10 sm:px-8 sm:pt-12 lg:px-12 lg:pb-32 lg:pt-20"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="mb-12 grid gap-8 border-t border-white/10 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
          <div>
            <p className="eyebrow">Pre-approved homes</p>
            <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-white/28">
              07 proven starting points
            </p>
          </div>
          <h2
            id="pre-approved-homes-heading"
            className="max-w-4xl text-[clamp(2.5rem,4.7vw,5.2rem)] font-medium leading-[0.94] tracking-[-0.06em]"
          >
            Proven housing types,
            <br />
            <span className="text-white/38">ready for local adaptation.</span>
          </h2>
        </div>

        <CatalogueModelGrid models={catalogModels} />

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

        {catalogueFollowOn ? (
          <div className="mt-10 border-t border-white/10 pt-10 lg:mt-12 lg:pt-12">
            {catalogueFollowOn}
          </div>
        ) : null}
      </div>
    </section>
  );
}
