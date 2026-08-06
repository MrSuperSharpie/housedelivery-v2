import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import {
  getInclusionPackage,
  inclusionPackages,
  inclusionProducts,
  type InclusionProduct,
} from "@/data/inclusions";

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
        className="object-cover"
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

export function InclusionsLibrary() {
  return (
    <main className="overflow-hidden bg-[#0b0c10] text-white">
      <section className="border-b border-white/10 px-5 pb-24 pt-36 sm:px-8 sm:pb-32 sm:pt-44 lg:px-12 lg:pb-40 lg:pt-52">
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
              Phase 01 / Flooring
            </p>
            <p className="max-w-3xl text-lg leading-8 text-white/62 lg:text-xl lg:leading-9">
              A controlled collection of finishes and systems organized into
              Essential, Premium and Signature packages. House Delivery
              coordinates selected products into repeatable project packages
              while retaining the flexibility required for site, design and
              project conditions.
            </p>
          </div>
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

      <section
        aria-labelledby="flooring-heading"
        className="border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Inclusions pilot / 01
              </p>
              <h2
                id="flooring-heading"
                className="mt-7 text-[clamp(3.8rem,8vw,8rem)] font-medium leading-[0.84] tracking-[-0.072em]"
              >
                Flooring
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-white/52 lg:justify-self-end lg:text-lg lg:leading-8">
              Three coordinated preliminary selections demonstrate how the
              package structure will work as the wider inclusions library is
              developed.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
            {inclusionProducts.map((product) => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </div>
        </div>
      </section>

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
