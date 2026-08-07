import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ArrowUpRight, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HeadlineReveal } from "@/components/headline-reveal";
import { ExploreAllInclusionsLink } from "@/components/inclusions-journey-links";
import { RevealText } from "@/components/reveal-text";
import { SiteHeader } from "@/components/site-header";
import { catalogModels, type CatalogModel } from "@/data/catalog";

type CatalogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return catalogModels.map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({
  params,
}: CatalogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const model: CatalogModel | undefined = catalogModels.find(
    (candidate) => candidate.slug === slug,
  );

  if (!model) {
    return {};
  }

  return {
    title: `${model.name} — CMHC Pre-Approved Design`,
    description: `${model.description} Review specifications and download the ${model.code} drawing package.`,
    openGraph: {
      title: `${model.name} — CMHC Pre-Approved Design`,
      description: model.description,
      type: "website",
      images: [{ url: model.image, alt: model.imageAlt }],
    },
  };
}

export default async function CatalogDetailPage({
  params,
}: CatalogDetailPageProps) {
  const { slug } = await params;
  const modelIndex = catalogModels.findIndex(
    (candidate) => candidate.slug === slug,
  );
  const model: CatalogModel | undefined = catalogModels[modelIndex];

  if (!model || modelIndex < 0) {
    notFound();
  }

  const nextModel: CatalogModel =
    catalogModels[(modelIndex + 1) % catalogModels.length];

  return (
    <>
      <SiteHeader />
      <main className="bg-[#0B0C10] text-white">
        {/* Cinematic hero */}
        <section className="relative min-h-[640px] overflow-hidden border-b border-white/10 sm:min-h-[760px] lg:min-h-[88vh]">
          <div className="absolute inset-0">
            <Image
              src={model.image}
              alt={model.imageAlt}
              fill
              quality={100}
              unoptimized={true}
              loading="eager"
              fetchPriority="high"
              sizes="100vw"
              className="object-cover render-crisp"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,12,16,.55)_0%,rgba(11,12,16,.1)_38%,rgba(11,12,16,.94)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,12,16,.5)_0%,transparent_62%)]" />

          <div className="relative z-10 mx-auto flex min-h-[640px] max-w-[1600px] flex-col justify-between px-5 pb-8 pt-28 sm:min-h-[760px] sm:px-8 lg:min-h-[88vh] lg:px-12 lg:pb-10">
            <div className="flex items-center justify-between">
              <Link
                href="/#cmhc"
                className="inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65 transition-colors hover:text-white"
              >
                <ArrowLeft size={14} />
                Pre-approved catalogue
              </Link>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/55">
                Design {model.number} /{" "}
                {String(catalogModels.length).padStart(2, "0")}
              </p>
            </div>

            <div>
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <span className="border border-white/30 bg-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
                  {model.code}
                </span>
                <span className="border border-white/30 bg-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
                  CMHC pre-approved
                </span>
              </div>

              <HeadlineReveal>
                <h1 className="max-w-[1300px] text-[clamp(3.4rem,9vw,9.5rem)] font-medium leading-[0.82] tracking-[-0.078em]">
                  {model.name}
                </h1>
              </HeadlineReveal>

              <div className="mt-10 grid items-end gap-8 border-t border-white/30 pt-6 sm:grid-cols-[1fr_auto]">
                <p className="max-w-xl text-sm leading-6 text-white/66 sm:text-base sm:leading-7">
                  {model.purpose}
                </p>
                <div className="flex items-end gap-3 sm:text-right">
                  <span className="text-5xl font-light tracking-[-0.07em] sm:text-7xl">
                    {model.squareFootage}
                  </span>
                  <span className="pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Sq. ft.
                    <br />
                    total area
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key specifications */}
        <section className="px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
              <div>
                <p className="eyebrow">Specifications / {model.code}</p>
                <h2 className="mt-7 max-w-4xl text-5xl font-medium leading-[0.92] tracking-[-0.06em] md:text-7xl">
                  <RevealText text="Key" />
                  <br />
                  <span className="text-white/40">
                    <RevealText text="specifications." delay={0.12} />
                  </span>
                </h2>
              </div>
              <div className="lg:pt-20">
                <p className="max-w-prose text-lg leading-relaxed text-white/55">
                  A proven catalogue baseline, adapted to your site. Every figure
                  below is a starting point for local engineering, foundations,
                  and permitting.
                </p>
              </div>
            </div>

            <div className="mt-24 grid border-l border-t border-white/14 sm:grid-cols-2 lg:grid-cols-3">
              {model.specs.map((spec, index) => (
                <dl
                  key={spec.label}
                  className="min-h-40 border-b border-r border-white/14 p-5 sm:min-h-48 sm:p-7 lg:min-h-52"
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <dt className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/35">
                        {spec.label}
                      </dt>
                      <span className="font-mono text-[9px] text-white/20">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <dd className="mt-12 max-w-xs text-2xl font-medium leading-tight tracking-[-0.04em] text-white/82 sm:text-3xl">
                      {spec.value}
                    </dd>
                  </div>
                </dl>
              ))}
            </div>
          </div>
        </section>

        {/* Editorial description */}
        <section className="border-t border-white/10 px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-16 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
              <div>
                <p className="eyebrow">Design intent</p>
                <HeadlineReveal variant="sweep" className="mt-7">
                  <h2 className="max-w-lg text-[clamp(2.6rem,5vw,5.6rem)] font-medium leading-[0.9] tracking-[-0.065em]">
                    Considered
                    <br />
                    <span className="text-white/38">by design.</span>
                  </h2>
                </HeadlineReveal>
              </div>
              <div className="max-w-3xl space-y-8">
                {model.editorial.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className="text-lg leading-8 text-white/70 lg:text-xl lg:leading-9"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PDF resource box */}
        <section className="px-5 pb-28 sm:px-8 lg:px-12 lg:pb-40">
          <div className="mx-auto max-w-[1504px]">
            <div className="relative overflow-hidden border border-white/12 bg-[#0e1014] p-8 sm:p-12 lg:p-16">
              <div
                className="absolute -right-16 -top-14 size-72 rounded-full border border-white/10 sm:size-96"
                aria-hidden="true"
              />
              <div className="relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                    Drawing package / {model.code}
                  </p>
                  <HeadlineReveal className="mt-8">
                    <h2 className="max-w-2xl text-[clamp(2.2rem,4vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.055em]">
                      Download the full
                      <br />
                      <span className="text-white/40">drawing package.</span>
                    </h2>
                  </HeadlineReveal>
                  <p className="mt-7 max-w-lg text-sm leading-6 text-white/52">
                    Certified architectural and structural drawings for the{" "}
                    {model.name} ({model.code}), presented for planning and
                    reference. Local engineering, permitting, and inspections
                    still apply.
                  </p>
                </div>
                <div className="lg:justify-self-end">
                  <a
                    href={model.downloadHref}
                    download
                    aria-label={`Download the PDF drawing package for ${model.name}`}
                    className="group inline-flex w-full items-center justify-between gap-6 border border-white bg-white px-7 py-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0B0C10] transition-colors hover:bg-transparent hover:text-white sm:w-auto"
                  >
                    Download PDF drawings
                    <Download size={16} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Conversion CTA */}
        <section
          id="inquire"
          className="scroll-mt-20 border-y border-white/12 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
        >
          <div className="mx-auto max-w-[1504px]">
            <p className="eyebrow">This design / On your site</p>
            <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
              <h2 className="max-w-6xl text-[clamp(3.4rem,8vw,8.5rem)] font-medium leading-[0.84] tracking-[-0.075em]">
                <RevealText text="Inquire about" />
                <br />
                <span className="text-white/40">
                  <RevealText text="this design." delay={0.12} />
                </span>
              </h2>
              <div className="max-w-sm border-l border-white/18 pl-6">
                <p className="text-sm leading-6 text-white/48">
                  Start with a project review. We&apos;ll map feasibility, local
                  requirements, site adaptation, financing context, and a
                  realistic delivery sequence for the {model.name}.
                </p>
                <ExploreAllInclusionsLink className="mt-7" />
                <Link
                  href="/#reserve"
                  className="group mt-5 flex items-center justify-between bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#0B0C10]"
                >
                  Inquire about this design
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Next design */}
        <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <Link
            href={`/catalog/${nextModel.slug}`}
            className="group mx-auto block max-w-[1504px]"
          >
            <div className="mb-6 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span>Next design</span>
              <span>{nextModel.code}</span>
            </div>
            <div className="relative aspect-[1.25/1] overflow-hidden bg-[#121419] sm:aspect-[2.2/1]">
              <Image
                src={nextModel.image}
                alt={nextModel.imageAlt}
                fill
                quality={100}
                unoptimized={true}
                sizes="95vw"
                className="object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.04] group-hover:brightness-100 render-crisp"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-8 p-6 sm:p-10">
                <HeadlineReveal variant="sweep">
                  <h2 className="text-[clamp(2.5rem,6vw,6.5rem)] font-medium leading-none tracking-[-0.065em]">
                    {nextModel.name}
                  </h2>
                </HeadlineReveal>
                <ArrowUpRight
                  size={24}
                  className="mb-2 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </div>
            </div>
          </Link>
        </section>
      </main>
    </>
  );
}
