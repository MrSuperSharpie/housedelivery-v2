import { Clock3 } from "lucide-react";

import type { HomeCoordinatedCategory as HomeCoordinatedCategoryData } from "@/data/home-configurator";

type HomeCoordinatedCategoryProps = {
  category: HomeCoordinatedCategoryData;
};

export function HomeCoordinatedCategory({
  category,
}: HomeCoordinatedCategoryProps) {
  return (
    <article
      id={`home-category-${category.id}`}
      data-home-category={category.id}
      data-category-kind="coordinated"
      data-category-state="coordinated"
      className="scroll-mt-28 border border-dashed border-white/16 bg-white/[0.012] px-6 py-8 sm:px-8 sm:py-10"
    >
      <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-7">
        <span className="grid size-12 place-items-center rounded-full border border-white/16 text-white/55">
          <Clock3 aria-hidden="true" className="size-4" strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.16em] text-white/55">
            {category.number} / Project coordinated
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-12">
            <div>
              <h3 className="text-3xl font-medium tracking-[-0.05em] text-white/82 sm:text-4xl">
                {category.title}
              </h3>
              <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#d8c4a5]">
                {category.coordinatedMessage}
              </p>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-white/55">
              {category.description}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
