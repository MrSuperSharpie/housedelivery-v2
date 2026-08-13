import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type EditorialBrandStatementProps = {
  chapter: string;
  children: ReactNode;
  align?: "left" | "right";
  strength?: "standard" | "thesis";
};

export function EditorialBrandStatement({
  chapter,
  children,
  align = "left",
  strength = "standard",
}: EditorialBrandStatementProps) {
  const isRightAligned = align === "right";
  const isThesis = strength === "thesis";

  return (
    <section
      aria-label={chapter}
      className="bg-[#0b0c10] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px] border-t border-white/10 pt-6 sm:pt-7">
        <div
          className={cn(
            "grid grid-cols-12 gap-y-10 lg:gap-x-8",
            isRightAligned && "lg:text-right",
          )}
        >
          <p
            className={cn(
              "eyebrow col-span-12",
              isRightAligned
                ? "lg:col-span-3 lg:col-start-10"
                : "lg:col-span-3",
            )}
          >
            {chapter}
          </p>
          <p
            className={cn(
              "col-span-12 font-medium text-white/88",
              isThesis
                ? "max-w-[1260px] text-[clamp(2.9rem,6vw,6.8rem)] leading-[0.9] tracking-[-0.065em]"
                : "max-w-[1180px] text-[clamp(2.35rem,4.7vw,5.3rem)] leading-[0.94] tracking-[-0.058em]",
              isRightAligned
                ? "lg:col-span-10 lg:col-start-3 lg:justify-self-end"
                : "lg:col-span-10 lg:col-start-3",
            )}
          >
            {children}
          </p>
        </div>
      </div>
    </section>
  );
}
