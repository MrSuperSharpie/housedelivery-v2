import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HeadlineReveal } from "@/components/headline-reveal";
import { HomeConfigurator } from "@/components/home-configurator";
import { HomeDesignToolCallout } from "@/components/home-design-tool-callout";
import { HomeDetailHero } from "@/components/home-detail-hero";
import { HomeEditorialGallery } from "@/components/home-editorial-gallery";
import { HomeFloorPlanViewer } from "@/components/home-floor-plan-viewer";
import { HomeDesignJourneyLink } from "@/components/inclusions-journey-links";
import { RevealText } from "@/components/reveal-text";
import { SiteHeader } from "@/components/site-header";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import { models, type HomeModel } from "@/data/models";

type HomeDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const sourceFidelityHomeSlugs = new Set([
  "mayne",
  "salt-spring",
  "keats",
  "saturna",
]);

const fullWidthHomeImageSizes =
  "(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1599px) calc(100vw - 96px), 1504px";

const pairedHomeImageSizes =
  "(max-width: 639px) calc(100vw - 40px), (max-width: 767px) calc(100vw - 64px), (max-width: 1023px) calc(50vw - 42px), (max-width: 1599px) calc(50vw - 58px), 742px";

const fittedFloorPlanImageSizes =
  "(max-width: 767px) 680px, (max-width: 1023px) calc(100vw - 112px), (max-width: 1599px) calc(100vw - 176px), 1424px";

export const dynamicParams = false;

export function generateStaticParams() {
  return models.map((model) => ({ slug: model.slug }));
}

function getResidenceName(model: HomeModel) {
  return model.name.endsWith("House") || model.name.endsWith("Duplex")
    ? model.name
    : `${model.name} House`;
}

export async function generateMetadata({
  params,
}: HomeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const model: HomeModel | undefined = models.find(
    (candidate) => candidate.slug === slug,
  );

  if (!model) {
    return {};
  }

  const residenceName = getResidenceName(model);

  return {
    title: residenceName,
    description: `${model.description} Explore the ${model.squareFeet.toLocaleString()} sq. ft. plan, specifications, and complete architectural gallery.`,
    openGraph: {
      title: residenceName,
      description: model.description,
      type: "website",
      images: [{ url: model.heroImage, alt: residenceName }],
    },
  };
}

function formatArea(value: number | null, squareMetres?: number | null) {
  if (value === null) {
    return squareMetres === undefined || squareMetres === null
      ? "Plan-specific"
      : `${squareMetres.toLocaleString()} m²`;
  }

  const squareFeet = `${value.toLocaleString()} sq. ft.`;
  return squareMetres === undefined || squareMetres === null
    ? squareFeet
    : `${squareMetres.toLocaleString()} m² / ${squareFeet}`;
}

export default async function HomeDetailPage({
  params,
}: HomeDetailPageProps) {
  const { slug } = await params;
  const modelIndex = models.findIndex((candidate) => candidate.slug === slug);
  const model: HomeModel | undefined = models[modelIndex];

  if (!model || modelIndex < 0) {
    notFound();
  }

  const nextModel: HomeModel = models[(modelIndex + 1) % models.length];
  const configuratorRegistration = getHomeConfiguratorRegistration(
    "custom-home",
    model.slug,
  );
  const configuratorDefinition = configuratorRegistration?.definition;
  const useSourceFidelityImages = sourceFidelityHomeSlugs.has(model.slug);
  const sourceFidelityImageProps = useSourceFidelityImages
    ? { imageQuality: 100, unoptimized: true }
    : {};
  const hasApprovedLookBook =
    configuratorRegistration?.migrationStatus === "canonical" &&
    configuratorDefinition !== undefined;
  const designToolDiscovery = {
    homeName:
      configuratorDefinition?.residenceLabel ??
      configuratorRegistration?.homeName ??
      model.name.replace(/^The\s+/, ""),
    href: hasApprovedLookBook ? "#home-inclusions" : undefined,
    availability: hasApprovedLookBook
      ? ("available" as const)
      : ("coming-soon" as const),
    ...(["keats", "salt-spring"].includes(model.slug)
      ? { showGalleryCallout: false }
      : {}),
  };
  const specifications = [
    { label: "Footprint", value: model.footprint ?? "Site-adapted" },
    {
      label: "Main level",
      value: formatArea(
        model.levels.main,
        model.levelSquareMetres?.main,
      ),
    },
    {
      label: "Upper level",
      value: formatArea(
        model.levels.upper,
        model.levelSquareMetres?.upper,
      ),
    },
    {
      label: "Total area",
      value: model.squareMetres
        ? `${model.squareMetres.toLocaleString()} m² / ${model.squareFeet.toLocaleString()} sq. ft.`
        : `${model.squareFeet.toLocaleString()} sq. ft.`,
    },
    {
      label: "Accommodation",
      value: `${model.bedrooms} bed · ${model.bathrooms ?? "Plan"} bath`,
    },
    { label: "Structure", value: model.structure },
  ] as const;

  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] text-white">
        <HomeDetailHero
          model={model}
          modelNumber={modelIndex + 1}
          modelCount={models.length}
          titleSuffix={getResidenceName(model) === model.name ? null : "House"}
          imageAlt={`${getResidenceName(model)} exterior`}
          {...sourceFidelityImageProps}
        />

        <section
          id="overview"
          className="scroll-mt-20 px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
              <div>
                <p className="eyebrow">Overview / {model.locationLabel}</p>
                <h2 className="mt-7 max-w-4xl text-5xl font-medium leading-[0.92] tracking-[-0.06em] md:text-7xl">
                  <RevealText text="A clearer way to" />
                  <br />
                  <span className="text-white/40">
                    <RevealText
                      text="build something lasting."
                      delay={0.12}
                    />
                  </span>
                </h2>
              </div>

              <div className="lg:pt-20">
                {/* MODEL DESCRIPTION BLOCK — remove this div for a strictly visual layout. */}
                <div
                  data-content-block="model-description"
                  className="max-w-prose"
                >
                  <p className="text-lg leading-relaxed text-neutral-400">
                    {model.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-24 grid border-l border-t border-white/14 sm:grid-cols-2 lg:grid-cols-3">
              {specifications.map((specification, index) => (
                <dl
                  key={specification.label}
                  className="min-h-40 border-b border-r border-white/14 p-5 sm:min-h-48 sm:p-7 lg:min-h-52"
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <dt className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/35">
                        {specification.label}
                      </dt>
                      <span className="font-mono text-[9px] text-white/20">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <dd className="mt-12 max-w-xs text-2xl font-medium leading-tight tracking-[-0.04em] text-white/82 sm:text-3xl">
                      {specification.value}
                    </dd>
                  </div>
                </dl>
              ))}
            </div>

            <div className="mt-8 grid gap-4 border-t border-white/12 pt-5 text-[9px] uppercase tracking-[0.17em] text-white/30 sm:grid-cols-3">
              <p>{model.storeys} storeys</p>
              <p>
                {model.garageLabel ??
                  (model.garageSpaces === null
                    ? "Garage configuration varies"
                    : model.garageSpaces === 0
                      ? "No garage"
                      : `${model.garageSpaces}-car garage`)}
              </p>
              <p>Site engineering required</p>
            </div>

            <HomeDesignToolCallout
              homeName={designToolDiscovery.homeName}
              href={designToolDiscovery.href}
              variant="primary"
              availability={designToolDiscovery.availability}
            />
          </div>
        </section>

        <HomeEditorialGallery
          modelName={model.name}
          images={model.images}
          floorPlanImage={model.floorPlanImage}
          narrative={model.narrative}
          designToolDiscovery={designToolDiscovery}
          {...sourceFidelityImageProps}
          imageSizes={
            useSourceFidelityImages
              ? {
                  full: fullWidthHomeImageSizes,
                  pair: pairedHomeImageSizes,
                }
              : undefined
          }
          imageLoading={useSourceFidelityImages ? "lazy" : undefined}
        />

        {configuratorDefinition ? (
          <HomeConfigurator
            definition={configuratorDefinition}
            directSourceImages={useSourceFidelityImages}
          />
        ) : null}

        <HomeFloorPlanViewer
          model={model}
          {...sourceFidelityImageProps}
          fittedImageSizes={
            useSourceFidelityImages ? fittedFloorPlanImageSizes : undefined
          }
          imageLoading={useSourceFidelityImages ? "lazy" : undefined}
        />

        {model.video ? (
          <section id="film" className="scroll-mt-24 px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
            <div className="mx-auto max-w-[1504px]">
              <div className="mb-12 grid gap-8 border-t border-white/15 pt-7 sm:grid-cols-2">
                <div>
                  <p className="eyebrow">Film / Walk through the residence</p>
                  <HeadlineReveal variant="sweep" className="mt-6">
                    <h2 className="text-4xl font-medium tracking-[-0.055em] sm:text-6xl">
                      Experience the scale.
                    </h2>
                  </HeadlineReveal>
                </div>
                <p className="max-w-lg self-end text-sm leading-7 text-white/45 sm:justify-self-end">
                  Move through the generous arrival, connected family spaces,
                  private wing, and indoor-outdoor rooms of the Langley House.
                </p>
              </div>
              <div className="aspect-video overflow-hidden border border-white/14 bg-[#090a0d]">
                <iframe
                  src={model.video.embedUrl}
                  title={model.video.title}
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        ) : null}

        <section
          id="reserve"
          className="scroll-mt-20 border-y border-white/12 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
        >
          <div className="mx-auto max-w-[1504px]">
            <p className="eyebrow">Your land / Your timeline / Your home</p>
            <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
              <HeadlineReveal>
                <h2 className="max-w-6xl text-[clamp(3.8rem,8.3vw,9rem)] font-medium leading-[0.84] tracking-[-0.075em]">
                  Begin your
                  <br />
                  <span className="text-white/40">project review.</span>
                </h2>
              </HeadlineReveal>
              <div className="max-w-sm border-l border-white/18 pl-6">
                <p className="text-sm leading-6 text-white/48">
                  Start with a project review. We’ll map feasibility, local
                  requirements, model fit, financing context, and a realistic
                  delivery sequence.
                </p>
                <HomeDesignJourneyLink
                  homeName={designToolDiscovery.homeName}
                  href={designToolDiscovery.href}
                  availability={designToolDiscovery.availability}
                  className="mt-7"
                />
                <Link
                  href="/#reserve"
                  className="group mt-5 flex items-center justify-between bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-black"
                >
                  Start your project review
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <Link
            href={`/homes/${nextModel.slug}`}
            className="group mx-auto block max-w-[1504px]"
          >
            <div className="mb-6 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span>Next residence</span>
              <span>Explore model</span>
            </div>
            <div className="relative aspect-[1.25/1] overflow-hidden bg-[#121419] sm:aspect-[2.2/1]">
              <Image
                src={nextModel.heroImage}
                alt={`${nextModel.name} House`}
                fill
                quality={100}
                unoptimized={true}
                loading={useSourceFidelityImages ? "lazy" : undefined}
                sizes={
                  useSourceFidelityImages
                    ? fullWidthHomeImageSizes
                    : "95vw"
                }
                className="object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.04] hover:brightness-100 group-hover:scale-[1.04] group-hover:brightness-100 render-crisp"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-8 p-6 sm:p-10">
                <h2 className="text-[clamp(2.7rem,6vw,6.5rem)] font-medium leading-none tracking-[-0.065em]">
                  <RevealText text={nextModel.name} />
                </h2>
                <ArrowRight
                  size={24}
                  className="mb-2 transition-transform group-hover:translate-x-2"
                />
              </div>
            </div>
          </Link>
        </section>

        <section className="border-t border-white/12 px-5 py-24 text-center sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="eyebrow">Beyond the collection</p>
            <HeadlineReveal variant="sweep" className="mx-auto mt-7 max-w-4xl">
              <h2 className="text-4xl font-medium leading-tight tracking-[-0.05em] sm:text-6xl">
                Can’t find your perfect plan? We’ve got hundreds more.
              </h2>
            </HeadlineReveal>
            <Link
              href="/#reserve"
              className="mt-10 inline-flex items-center justify-center border border-white/45 px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-[#0b0c10]"
            >
              Contact Our Design Team
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
