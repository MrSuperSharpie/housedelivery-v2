import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/cn";

type EditorialBrandStatementProps = {
  chapter: string;
  children: ReactNode;
  variant: "manifesto" | "feature" | "process";
  image?: {
    src: string;
    alt: string;
  };
};

export function EditorialBrandStatement({
  chapter,
  children,
  variant,
  image,
}: EditorialBrandStatementProps) {
  const isFeature = variant === "feature";
  const isManifesto = variant === "manifesto";

  return (
    <section
      aria-label={chapter}
      className={cn(
        "bg-[#0b0c10] px-5 sm:px-8 lg:px-12",
        isManifesto
          ? "py-14 sm:py-16 lg:py-20"
          : "py-16 sm:py-20 lg:py-24",
      )}
    >
      <div className="mx-auto max-w-[1504px] border-t border-white/10 pt-6 sm:pt-7">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          {isFeature && image ? (
            <figure className="relative col-span-12 aspect-[4/3] overflow-hidden bg-[#13151a] md:col-span-6 lg:aspect-[5/4]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                quality={90}
                sizes="(max-width: 767px) 100vw, (max-width: 1599px) 50vw, 736px"
                className="object-cover brightness-90"
              />
            </figure>
          ) : null}

          <div
            className={cn(
              "col-span-12",
              isFeature && image
                ? "md:col-span-6 md:pl-6 lg:col-span-5 lg:col-start-8 lg:self-center lg:pl-0"
                : "lg:col-span-9 lg:col-start-4",
            )}
          >
            <p className="eyebrow">{chapter}</p>
            <p
              className={cn(
                "font-medium text-white/86",
                isManifesto
                  ? "mt-6 max-w-[1060px] text-[clamp(1.9rem,3.5vw,3.2rem)] leading-[0.96] tracking-[-0.052em] sm:mt-7"
                  : "mt-6 max-w-[940px] text-[clamp(1.8rem,3.15vw,3rem)] leading-[0.98] tracking-[-0.048em] sm:mt-7",
              )}
            >
              {children}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
