"use client";

import { useState } from "react";

import { ProductImageGallery } from "@/components/product-image-gallery";
import type { InclusionProduct, InclusionPackage } from "@/data/inclusions";

type SelectableInclusionCardProps = {
  product: InclusionProduct;
  inclusionPackage: Pick<InclusionPackage, "name" | "positioning">;
};

export function SelectableInclusionCard({
  product,
  inclusionPackage,
}: SelectableInclusionCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const choices = product.choices ?? [];
  const activeChoice = choices[activeIndex] ?? choices[0];
  const productHeadingId = `product-${product.sku.toLowerCase()}`;

  if (!activeChoice) return null;

  return (
    <article
      aria-labelledby={productHeadingId}
      className="flex h-full flex-col border border-white/12 bg-[#0e1014]"
      data-selectable-inclusion={product.sku}
      data-active-choice={activeChoice.name}
    >
      <ProductImageGallery
        images={choices.map((choice) => choice.image)}
        productName={activeChoice.name}
        productSku={product.sku}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        selectionLabels={choices.map((choice) => choice.name)}
      />

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

        <div className="pt-8" aria-live="polite">
          <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/60">
            {product.category}
          </p>
          <h3
            id={productHeadingId}
            className="mt-4 text-[clamp(2rem,3.2vw,3.3rem)] font-medium leading-[0.95] tracking-[-0.055em] text-white/92"
          >
            {activeChoice.name}
          </h3>
          <p className="mt-6 text-sm leading-6 text-white/53">
            {activeChoice.customerDescription}
          </p>
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
