"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { InclusionImage } from "@/data/inclusions";

type ProductImageGalleryProps = {
  images: readonly InclusionImage[];
  productName: string;
  productSku: string;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  selectionLabels?: readonly string[];
};

export function ProductImageGallery({
  images,
  productName,
  productSku,
  activeIndex: controlledActiveIndex,
  onActiveIndexChange,
  selectionLabels,
}: ProductImageGalleryProps) {
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const activeIndex = controlledActiveIndex ?? internalActiveIndex;
  const activeImage = images[activeIndex] ?? images[0];
  const imageCount = images.length;

  const selectImage = (index: number) => {
    setInternalActiveIndex(index);
    onActiveIndexChange?.(index);
  };

  const showPreviousImage = () => {
    selectImage(activeIndex === 0 ? imageCount - 1 : activeIndex - 1);
  };

  const showNextImage = () => {
    selectImage(activeIndex === imageCount - 1 ? 0 : activeIndex + 1);
  };

  return (
    <div
      className="relative aspect-[4/3] overflow-hidden border-b border-white/10 bg-[#121419]"
      data-product-gallery={productSku}
    >
      <Image
        key={activeImage.src}
        src={activeImage.src}
        alt={activeImage.alt}
        fill
        quality={90}
        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
        className={
          activeImage.fit === "contain" ? "object-contain" : "object-cover"
        }
      />

      {imageCount > 1 ? (
        <>
          <button
            type="button"
            onClick={showPreviousImage}
            aria-label={`Show previous image for ${productName}`}
            className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center border border-white/18 bg-black/55 text-white/72 backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-black/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={showNextImage}
            aria-label={`Show next image for ${productName}`}
            className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center border border-white/18 bg-black/55 text-white/72 backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-black/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
          </button>

          <div
            aria-label={`Choose an image for ${productName}`}
            className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center rounded-full border border-white/12 bg-black/55 px-1 backdrop-blur-sm"
            role="group"
          >
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => selectImage(index)}
                aria-current={index === activeIndex ? "true" : undefined}
                aria-label={
                  selectionLabels?.[index]
                    ? `Select ${selectionLabels[index]}`
                    : `Show image ${index + 1} of ${imageCount} for ${productName}`
                }
                className="group flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
              >
                <span
                  aria-hidden="true"
                  className={`block size-1.5 rounded-full transition-colors ${
                    index === activeIndex
                      ? "bg-white/90"
                      : "bg-white/38 group-hover:bg-white/65"
                  }`}
                />
              </button>
            ))}
          </div>

          <span className="sr-only" aria-live="polite">
            Image {activeIndex + 1} of {imageCount}
          </span>
        </>
      ) : null}
    </div>
  );
}
