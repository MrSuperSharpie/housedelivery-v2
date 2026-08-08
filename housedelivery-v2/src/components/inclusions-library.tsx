import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import {
  getInclusionPackage,
  inclusionCategories,
  inclusionPackages,
  type InclusionCategory,
  type InclusionProduct,
} from "@/data/inclusions";

const curationMessage =
  "We’re curating the House Delivery inclusion collection. Essential, Premium and Signature selections will be expanded as products, specifications and technical information are confirmed.";

function ProductImage({ product }: { product: InclusionProduct }) {
  if (!product.image) {
    return (
      <div className="flex aspect-[4/3] items-end border-b border-white/10 bg-[#121419] p-6 sm:p-8">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Controlled imagery
          </p>
          <p className="mt-3 text-lg font-medium tracking-[-0.025em] text-white/55">
            Product image pending
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden border-b border-white/10 bg-[#121419]">
      <Image
        src={product.image.src}
        alt={product.image.alt}
        fill
        quality={90}
        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
        className={
          product.image.fit === "contain" ? "object-contain" : "object-cover"
        }
      />
    </div>
  );
}

function ProductCard({ product }: { product: InclusionProduct }) {
  const inclusionPackage = getInclusionPackage(product.packageTier);
  const productHeadingId = `product-${product.sku.toLowerCase()}`;

  return (
    <article
      aria-labelledby={productHeadingId}
      className="flex h-full flex-col border border-white/12 bg-[#0e1014]"
    >
      <ProductImage product={product} />

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-start justify-between gap-6 border-b border-white/10 pb-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {inclusionPackage.name} package
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/54">
              {inclusionPackage.positioning}
            </p>
          </div>
          <dl className="text-right">
            <dt className="text-[8px] uppercase tracking-[0.18em] text-white/60">
              House Delivery SKU
            </dt>
            <dd className="mt-2 font-mono text-[10px] tracking-[0.12em] text-white/62">
              {product.sku}
            </dd>
          </dl>
        </div>

        <div className="pt-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/60">
            {product.category}
          </p>
          <h3
            id={productHeadingId}
            className="mt-4 text-[clamp(2rem,3.2vw,3.3rem)] font-medium leading-[0.95] tracking-[-0.055em] text-white/92"
          >
            {product.name}
          </h3>
          <p className="mt-6 text-sm leading-6 text-white/53">
            {product.customerDescription}
          </p>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <h4 className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/60">
            Listed specification
          </h4>
          <ul className="mt-5 space-y-3">
            {product.specifications.map((specification) => (
              <li
                key={specification}
                className="flex gap-3 text-sm leading-6 text-white/58"
              >
                <Check
                  aria-hidden="true"
                  className="mt-1 size-3.5 shrink-0 text-white/38"
                  strokeWidth={1.5}
                />
                <span>{specification}</span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="mt-10 grid grid-cols-2 border-l border-t border-white/10 text-sm">
          <div className="min-h-28 border-b border-r border-white/10 p-4">
            <dt className="text-[8px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/60">
              Selection status
            </dt>
            <dd className="mt-4 leading-5 text-white/67">
              {product.selectionStatus}
            </dd>
          </div>
          <div className="min-h-28 border-b border-r border-white/10 p-4">
            <dt className="text-[8px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/60">
              Sample
            </dt>
            <dd className="mt-4 leading-5 text-white/67">
              {product.sampleRequired ? "Required" : "Not required"}
            </dd>
          </div>
          <div className="min-h-28 border-b border-r border-white/10 p-4">
            <dt className="text-[8px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/60">
              Technical review
            </dt>
            <dd className="mt-4 leading-5 text-white/67">
              {product.technicalReviewRequired ? "Required" : "Not required"}
            </dd>
          </div>
          <div className="min-h-28 border-b border-r border-white/10 p-4">
            <dt className="text-[8px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/60">
              Project-specific review
            </dt>
            <dd className="mt-4 leading-5 text-white/67">
              {product.projectSpecificApprovalRequired
                ? "Required"
                : "Not required"}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-xs leading-5 text-white/60">
          {product.availability}
        </p>
      </div>
    </article>
  );
}

function CategoryHeroImage({ category }: { category: InclusionCategory }) {
  return (
    <div className="flex size-full flex-col bg-[#121419]">
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {category.heroImage ? (
          <Image
            src={category.heroImage.src}
            alt={category.heroImage.alt}
            fill
            quality={90}
            sizes="(max-width: 1023px) 100vw, 58vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-end p-6 sm:p-8 lg:p-10">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
                Controlled category imagery
              </p>
              <p className="mt-3 text-xl font-medium tracking-[-0.03em] text-white/55 sm:text-2xl">
                Category imagery pending
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/12 bg-[#0e1014] px-6 py-5 sm:px-8 sm:py-6 lg:px-10">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
          CURATING THE COLLECTION
        </p>
        <p className="mt-3 max-w-2xl text-xs leading-5 text-white/52 sm:text-sm sm:leading-6">
          {curationMessage}
        </p>
      </div>
    </div>
  );
}

function BrowseInclusions() {
  return (
    <section
      aria-labelledby="browse-inclusions-heading"
      className="border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
              Catalogue index
            </p>
            <h2
              id="browse-inclusions-heading"
              className="mt-7 max-w-3xl text-[clamp(3.25rem,7vw,7.5rem)] font-medium leading-[0.86] tracking-[-0.07em]"
            >
              Browse
              <br />
              <span className="text-white/38">Inclusions</span>
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-white/52 lg:justify-self-end lg:text-lg lg:leading-8">
            Move directly to a category. Controlled products will be introduced
            as selections, imagery and technical information are approved.
          </p>
        </div>

        <nav aria-label="Browse inclusion categories" className="mt-14 lg:mt-20">
          <ol className="grid border-l border-t border-white/12 sm:grid-cols-2 lg:grid-cols-3">
            {inclusionCategories.map((category) => (
              <li key={category.id}>
                <a
                  href={`#${category.id}`}
                  className="group flex min-h-24 items-center justify-between gap-6 border-b border-r border-white/12 px-5 py-5 transition-colors hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white sm:min-h-28 sm:px-6"
                >
                  <span className="text-sm font-medium tracking-[-0.02em] text-white/76 transition-colors group-hover:text-white group-focus-visible:text-white">
                    {category.shortName}
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-mono text-[9px] tracking-[0.18em] text-white/32"
                  >
                    {category.number}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}

function CategorySection({
  category,
  index,
}: {
  category: InclusionCategory;
  index: number;
}) {
  const headingId = `inclusion-${category.id}-heading`;
  const hasProducts = category.products.length > 0;

  return (
    <section
      id={category.id}
      aria-labelledby={headingId}
      className={`relative scroll-mt-24 border-t border-white/10 px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-36 ${
        index % 2 === 1 ? "bg-[#0d0f13]" : "bg-[#0b0c10]"
      }`}
    >
      <span
        id={`inclusion-${category.id}`}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 scroll-mt-24"
      />
      <div className="mx-auto max-w-[1504px]">
        <div className="grid overflow-hidden border border-white/12 lg:grid-cols-12">
          <div className="border-b border-white/12 lg:col-span-7 lg:border-b-0 lg:border-r">
            <CategoryHeroImage category={category} />
          </div>

          <div className="flex min-h-[22rem] flex-col p-6 sm:min-h-[25rem] sm:p-9 lg:col-span-5 lg:min-h-[34rem] lg:p-10 xl:p-12">
            <div className="flex items-start justify-between gap-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
                {category.eyebrow}
              </p>
              <span
                aria-hidden="true"
                className="font-mono text-[9px] tracking-[0.18em] text-white/30"
              >
                {category.number} / {String(inclusionCategories.length).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-auto pt-20">
              <h2
                id={headingId}
                className="max-w-3xl text-[clamp(2.75rem,5.5vw,5.8rem)] font-medium leading-[0.88] tracking-[-0.065em] text-white/92"
              >
                {category.name}
              </h2>
              <p className="mt-7 max-w-xl text-base leading-7 text-white/56 lg:text-lg lg:leading-8">
                {category.description}
              </p>
              {category.packageContext ? (
                <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-6 text-white/50">
                  {category.packageContext}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {hasProducts ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:mt-16 xl:grid-cols-3 xl:gap-8">
            {category.products.map((product) => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid min-h-32 border border-white/12 bg-[#0e1014] sm:mt-8 sm:grid-cols-[0.7fr_1.3fr] lg:mt-10">
            <div className="flex items-end border-b border-white/10 p-6 sm:border-b-0 sm:border-r sm:p-8">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Controlled selection area
                </p>
                <p className="mt-3 text-xl font-medium tracking-[-0.03em] text-white/72">
                  Selections in development
                </p>
              </div>
            </div>
            <p className="max-w-2xl self-center p-6 text-sm leading-7 text-white/52 sm:p-8">
              No products are displayed until House Delivery names, package
              assignments, descriptions and supporting information are ready
              for customer review.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function InclusionsLibrary() {
  return (
    <main
      data-inclusions-library
      className="overflow-hidden bg-[#0b0c10] text-white"
    >
      <section className="border-b border-white/10 px-5 pb-16 pt-36 sm:px-8 sm:pb-20 sm:pt-44 lg:px-12 lg:pb-24 lg:pt-52">
        <div className="mx-auto max-w-[1504px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
            House Delivery Kit of Parts
          </p>
          <HeadlineReveal trigger="mount" className="mt-8">
            <h1 className="max-w-[1400px] text-[clamp(3.25rem,11vw,11rem)] font-medium leading-[0.8] tracking-[-0.078em]">
              Inclusions
              <br />
              <span className="text-white/38">Library</span>
            </h1>
          </HeadlineReveal>

          <div className="mt-16 grid gap-8 border-t border-white/16 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Catalogue framework / 15 categories
            </p>
            <div className="max-w-3xl">
              <p className="text-xl leading-8 tracking-[-0.025em] text-white/76 sm:text-2xl sm:leading-9">
                Curated finishes. Coordinated systems. One House Delivery
                approach.
              </p>
              <p className="mt-5 text-sm leading-7 text-white/54 sm:text-base sm:leading-8">
                A controlled collection of finishes and systems organized into
                Essential, Premium and Signature packages. House Delivery
                coordinates selected products into repeatable project packages
                while retaining the flexibility required for site, design and
                project conditions.
              </p>
            </div>
          </div>

          <figure className="mt-14 sm:mt-20 lg:mt-24">
            <div className="relative aspect-[4/3] overflow-hidden border border-white/12 bg-[#121419] sm:aspect-[3/2] lg:aspect-[16/9]">
              <Image
                src="/images/inclusions/inclusions-hero.webp"
                alt="Warm contemporary living room with timber ceilings, framed mountain views and coordinated interior finishes."
                fill
                quality={90}
                loading="eager"
                sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1599px) calc(100vw - 96px), 1504px"
                className="object-cover object-center"
              />
            </div>
            <figcaption className="mt-4 max-w-2xl border-l border-white/20 pl-4 text-xs leading-5 text-white/48">
              Illustrative design inspiration. Final selections vary by package
              and project.
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        aria-labelledby="catalogue-notice-heading"
        className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="mx-auto max-w-[1504px] border border-white/18 bg-[#0e1014] p-6 sm:p-9 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.6fr_1.4fr] lg:gap-20">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Catalogue notice
              </p>
              <h2
                id="catalogue-notice-heading"
                className="mt-5 max-w-sm text-3xl font-medium leading-tight tracking-[-0.045em] text-white/88"
              >
                A preliminary selection pathway.
              </h2>
            </div>
            <div className="space-y-5 text-sm leading-7 text-white/57 sm:text-base">
              <p>
                Selections shown are preliminary and subject to availability,
                substitution and project-specific review. Final products,
                specifications and commercial terms are confirmed only after
                design, technical, site and agreement review. Images and
                descriptions are illustrative and do not establish
                certification, code compliance or final supply.
              </p>
              <p className="border-t border-white/10 pt-5 text-white/55">
                House Delivery may propose an approved alternative where a
                selected product is unavailable or unsuitable for the final
                project conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="package-comparison-heading"
        className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Package comparison
              </p>
              <h2
                id="package-comparison-heading"
                className="mt-7 max-w-3xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                One system.
                <br />
                <span className="text-white/38">Three expressions.</span>
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-white/52 lg:justify-self-end lg:text-lg lg:leading-8">
              Essential establishes the coordinated project baseline. Premium
              and Signature build on that foundation through controlled
              material, finish and detailing upgrades.
            </p>
          </div>

          <div className="mt-16 grid border-l border-t border-white/12 lg:mt-24 lg:grid-cols-3">
            {inclusionPackages.map((inclusionPackage) => (
              <article
                key={inclusionPackage.id}
                className="flex min-h-80 flex-col border-b border-r border-white/12 p-6 sm:p-8 lg:min-h-[28rem]"
              >
                <div className="flex items-start justify-between gap-6">
                  <span
                    aria-hidden="true"
                    className="font-mono text-[10px] tracking-[0.18em] text-white/26"
                  >
                    {inclusionPackage.number}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    {inclusionPackage.positioning}
                  </span>
                </div>
                <div className="mt-auto pt-20">
                  <h3 className="text-[clamp(2.6rem,4.5vw,4.8rem)] font-medium leading-none tracking-[-0.06em] text-white/92">
                    {inclusionPackage.name}
                  </h3>
                  <p className="mt-6 max-w-sm text-sm leading-7 text-white/50">
                    {inclusionPackage.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <BrowseInclusions />

      {inclusionCategories.map((category, index) => (
        <CategorySection key={category.id} category={category} index={index} />
      ))}

      <section className="border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-24">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                From preliminary to project-specific
              </p>
              <h2 className="mt-7 max-w-5xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]">
                Selections begin here.
                <br />
                <span className="text-white/38">Confirmation comes later.</span>
              </h2>
            </div>
            <div className="border-l border-white/15 pl-6 sm:pl-8">
              <p className="text-sm leading-7 text-white/52">
                Final selections are developed through project discovery and
                confirmed through the project agreement and technical-review
                process. Begin with your site, priorities and preferred package
                to establish the right project pathway.
              </p>
              <Link
                href="/#reserve"
                className="group mt-8 inline-flex min-h-11 items-center gap-5 border border-white bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Begin project review
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
