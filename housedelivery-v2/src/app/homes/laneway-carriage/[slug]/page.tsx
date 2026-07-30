import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HeadlineReveal } from "@/components/headline-reveal";
import { HomeDetailHero } from "@/components/home-detail-hero";
import { HomeEditorialGallery } from "@/components/home-editorial-gallery";
import { HomeFloorPlanViewer } from "@/components/home-floor-plan-viewer";
import { RevealText } from "@/components/reveal-text";
import { SiteHeader } from "@/components/site-header";
import {
  carriageHomes,
  type CarriageHome,
  type CarriageHomeImage,
} from "@/data/carriage-homes";

type CarriageHomeDetailPageProps = {
  params: Promise<{ slug: string }>;
};

type CollectionLinkProps = {
  direction: "previous" | "next";
  model: CarriageHome;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return carriageHomes.map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({
  params,
}: CarriageHomeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = carriageHomes.find((candidate) => candidate.slug === slug);

  if (!model) {
    return {};
  }

  const heroImage = model.images[0];

  return {
    title: `${model.name} — Laneway & Carriage Homes`,
    description: model.description,
    openGraph: {
      title: `${model.name} — Laneway & Carriage Homes`,
      description: model.description,
      type: "website",
      images: [{ url: heroImage.src, alt: heroImage.alt }],
    },
  };
}

function findFloorPlan(model: CarriageHome): CarriageHomeImage | undefined {
  return model.images.find(
    (image) =>
      image.fit === "contain" &&
      image.label.toLowerCase().includes("floor plan"),
  );
}

function CollectionLink({ direction, model }: CollectionLinkProps) {
  const image = model.images[0];
  const isPrevious = direction === "previous";

  return (
    <Link
      href={`/homes/laneway-carriage/${model.slug}`}
      className="group block"
      aria-label={`View ${isPrevious ? "previous" : "next"} Laneway and Carriage home: ${model.name}`}
    >
      <div className="mb-5 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
        <span>{isPrevious ? "Previous residence" : "Next residence"}</span>
        <span>Laneway / Carriage</span>
      </div>
      <div className="relative aspect-[1.25/1] overflow-hidden bg-[#121419] sm:aspect-[1.65/1]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          quality={90}
          sizes="(max-width: 767px) 100vw, 50vw"
          className="object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.04] group-hover:brightness-100 group-focus-visible:scale-[1.04] group-focus-visible:brightness-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-6 sm:p-8">
          {isPrevious ? (
            <ArrowLeft
              size={20}
              className="mb-1 shrink-0 transition-transform group-hover:-translate-x-1 group-focus-visible:-translate-x-1"
              aria-hidden="true"
            />
          ) : null}
          <h2
            className={`text-[clamp(2rem,4vw,4rem)] font-medium leading-none tracking-[-0.06em] ${
              isPrevious ? "text-right" : ""
            }`}
          >
            {model.name}
          </h2>
          {isPrevious ? null : (
            <ArrowRight
              size={20}
              className="mb-1 shrink-0 transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function CarriageHomeDetailPage({
  params,
}: CarriageHomeDetailPageProps) {
  const { slug } = await params;
  const modelIndex = carriageHomes.findIndex(
    (candidate) => candidate.slug === slug,
  );
  const model = carriageHomes[modelIndex];

  if (!model || modelIndex < 0) {
    notFound();
  }

  const floorPlan = findFloorPlan(model);

  if (!floorPlan) {
    notFound();
  }

  const previousModel =
    carriageHomes[
      (modelIndex - 1 + carriageHomes.length) % carriageHomes.length
    ];
  const nextModel = carriageHomes[(modelIndex + 1) % carriageHomes.length];
  const heroImage = model.images[0];

  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] text-white">
        <HomeDetailHero
          model={{
            name: model.name,
            heroImage: heroImage.src,
            summary: model.description,
            locationLabel: "Laneway / Carriage",
          }}
          modelNumber={modelIndex + 1}
          modelCount={carriageHomes.length}
          modelLabel="Residence"
          collectionHref="/#carriage-homes"
          collectionLabel="Laneway & Carriage homes"
          secondaryBadge="Compact residence"
          titleSuffix={null}
          imageAlt={heroImage.alt}
          imageQuality={90}
          unoptimized={false}
          imagePresentation="contained"
        />

        <section
          id="overview"
          className="scroll-mt-20 px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
              <div>
                <p className="eyebrow">Overview / Laneway &amp; Carriage</p>
                <h2 className="mt-7 max-w-4xl text-5xl font-medium leading-[0.92] tracking-[-0.06em] md:text-7xl">
                  <RevealText text="Compact living," />
                  <br />
                  <span className="text-white/40">
                    <RevealText text="considered in full." delay={0.12} />
                  </span>
                </h2>
              </div>

              <div className="lg:pt-20">
                <p className="max-w-prose text-lg leading-relaxed text-neutral-400">
                  {model.description}
                </p>
              </div>
            </div>

            <div className="mt-20 grid gap-6 border-t border-white/12 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
              <p className="eyebrow">Planning note</p>
              <p className="max-w-3xl text-sm leading-7 text-white/42">
                Each home must be adapted to the property, local zoning,
                setbacks, servicing, access, climate conditions, and applicable
                building-code requirements.
              </p>
            </div>
          </div>
        </section>

        <HomeEditorialGallery
          modelName={model.name}
          images={model.images}
          floorPlanImage={floorPlan.src}
          imageQuality={90}
          unoptimized={false}
        />

        <HomeFloorPlanViewer
          model={{
            name: model.name,
            floorPlanImage: floorPlan.src,
          }}
          imageAlt={floorPlan.alt}
          imageQuality={90}
          unoptimized={false}
        />

        <section
          id="inquire"
          className="scroll-mt-20 border-y border-white/12 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
        >
          <div className="mx-auto max-w-[1504px]">
            <p className="eyebrow">This residence / On your property</p>
            <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
              <HeadlineReveal>
                <h2 className="max-w-6xl text-[clamp(3.4rem,8vw,8.5rem)] font-medium leading-[0.84] tracking-[-0.075em]">
                  Begin your
                  <br />
                  <span className="text-white/40">project review.</span>
                </h2>
              </HeadlineReveal>
              <div className="max-w-sm border-l border-white/18 pl-6">
                <p className="text-sm leading-6 text-white/48">
                  Start with a project review. We&apos;ll map property fit,
                  local requirements, site adaptation, and a realistic delivery
                  sequence for the {model.name}.
                </p>
                <Link
                  href="/#reserve"
                  className="group mt-8 flex items-center justify-between bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#0b0c10]"
                >
                  Start your project review
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <nav
          aria-label="Laneway and Carriage home collection"
          className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
        >
          <div className="mx-auto grid max-w-[1504px] gap-12 md:grid-cols-2">
            <CollectionLink direction="previous" model={previousModel} />
            <CollectionLink direction="next" model={nextModel} />
          </div>
        </nav>
      </main>
    </>
  );
}
