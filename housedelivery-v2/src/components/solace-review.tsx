import { Check, Pencil } from "lucide-react";
import Image from "next/image";

import type { HomeDesignDirection } from "@/data/home-design-collections";
import type {
  SolaceInclusionCategory,
  SolaceInclusionCategoryId,
  SolaceInclusionOption,
} from "@/data/solace-configuration";

type SolaceReviewProps = {
  designDirection: HomeDesignDirection;
  categories: readonly SolaceInclusionCategory[];
  completedSelections: readonly {
    category: SolaceInclusionCategory;
    option: SolaceInclusionOption;
  }[];
  onEditCategory: (categoryId: SolaceInclusionCategoryId) => void;
};

function getLevelLabel(option: SolaceInclusionOption) {
  return option.level === "premium"
    ? "Premium — Included"
    : "Signature — Upgrade";
}

export function SolaceReview({
  designDirection,
  categories,
  completedSelections,
  onEditCategory,
}: SolaceReviewProps) {
  const selectableCount = categories.filter(
    (category) => category.status === "selectable",
  ).length;
  const isReady = completedSelections.length === selectableCount;
  const completedByCategory = new Map(
    completedSelections.map((selection) => [selection.category.id, selection]),
  );

  return (
    <section
      id="review-my-solace"
      tabIndex={-1}
      aria-labelledby="review-my-solace-heading"
      data-review-ready={isReady ? "true" : "false"}
      className="scroll-mt-20 border-b border-white/10 bg-[#0e1014] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-12 border-t border-white/16 pt-7 lg:grid-cols-[0.76fr_1.24fr] lg:items-end lg:gap-20">
          <div>
            <p className="eyebrow">Your evolving specification book</p>
            <h2
              id="review-my-solace-heading"
              className="mt-7 text-[clamp(3.8rem,8vw,8.5rem)] font-medium leading-[0.84] tracking-[-0.075em]"
            >
              Review
              <br />
              <span className="text-white/40">My Solace.</span>
            </h2>
          </div>
          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-base leading-8 text-white/56 lg:text-lg">
              {isReady
                ? "Your controlled Solace selections are assembled below and remain editable before a future project submission step is introduced."
                : `Complete ${selectableCount - completedSelections.length} more ${selectableCount - completedSelections.length === 1 ? "selection" : "selections"} to assemble the first review-ready My Solace specification.`}
            </p>
            <p className="mt-5 text-xs leading-6 text-white/38">
              This review is not a final specification, order or project
              approval. Final products, finishes and availability are confirmed
              during project review.
            </p>
          </div>
        </div>

        <dl className="mt-14 grid border-l border-t border-white/12 sm:grid-cols-2 lg:mt-20">
          <div className="border-b border-r border-white/12 p-6 sm:p-8">
            <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/38">
              Residence
            </dt>
            <dd className="mt-6 text-3xl font-medium tracking-[-0.045em] text-white/86">
              Solace
            </dd>
          </div>
          <div className="border-b border-r border-white/12 p-6 sm:p-8">
            <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/38">
              Design Direction
            </dt>
            <dd className="mt-6 text-3xl font-medium tracking-[-0.045em] text-white/86">
              {designDirection.name}
            </dd>
          </div>
        </dl>

        <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const selection = completedByCategory.get(category.id);

            return (
              <li
                key={category.id}
                data-review-category={category.id}
                data-review-state={
                  selection
                    ? "complete"
                    : category.status === "coordinated-later"
                      ? "coordinated-later"
                      : "not-selected"
                }
                className="flex min-h-64 flex-col border border-white/12 bg-[#0b0c10]"
              >
                {selection ? (
                  <div className="relative aspect-[16/9] overflow-hidden border-b border-white/12 bg-[#14161a]">
                    <Image
                      src={selection.option.primaryImage.src}
                      alt={selection.option.primaryImage.alt}
                      fill
                      quality={90}
                      sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 50vw, 33vw"
                      className={
                        selection.option.primaryImage.fit === "contain"
                          ? "object-contain"
                          : "object-cover"
                      }
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-mono text-[9px] tracking-[0.16em] text-white/30">
                      {category.number}
                    </p>
                    {selection ? (
                      <Check
                        aria-label="Complete"
                        className="size-3.5 text-white/64"
                        strokeWidth={2}
                      />
                    ) : null}
                  </div>
                  <h3 className="mt-5 text-2xl font-medium tracking-[-0.04em] text-white/82">
                    {category.title}
                  </h3>
                  <p className="mt-3 text-xs leading-5 text-white/44">
                    {selection
                      ? selection.option.name
                      : category.status === "coordinated-later"
                        ? "Coordinated with the project"
                        : "Not yet selected"}
                  </p>
                  {selection ? (
                    <div className="mt-auto flex items-end justify-between gap-5 border-t border-white/10 pt-5">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-white/42">
                        {getLevelLabel(selection.option)}
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditCategory(category.id)}
                        className="inline-flex min-h-9 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.17em] text-white/52 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                      >
                        <Pencil
                          aria-hidden="true"
                          className="size-3"
                          strokeWidth={1.5}
                        />
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
          <li className="flex min-h-64 flex-col justify-between border border-dashed border-white/14 p-5 sm:p-6">
            <p className="font-mono text-[9px] tracking-[0.16em] text-white/30">
              Flooring / Zone-based
            </p>
            <div>
              <h3 className="text-2xl font-medium tracking-[-0.04em] text-white/58">
                Flooring chapter reserved
              </h3>
              <p className="mt-3 text-xs leading-5 text-white/36">
                Living, bedroom, wet-area, service-space and stair zones will be
                coordinated independently in a dedicated chapter.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
