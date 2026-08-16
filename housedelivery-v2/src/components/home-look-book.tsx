import { ArrowRight, BookOpen, Check, Pencil } from "lucide-react";
import Image from "next/image";

import { HomeConfiguratorJourney } from "@/components/home-configurator-journey";
import type { HomeDesignDirection } from "@/data/home-design-collections";
import {
  getHomeInclusionLevelLabel,
  getRequiredCategories,
  getSelectedFlooringOption,
  getSelectedStandardOption,
  isCategoryComplete,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
  type HomeLookBookItem,
} from "@/data/home-configurator";

type HomeLookBookProps = {
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
  designDirection: HomeDesignDirection;
  onEditCategory: (categoryId: string, zoneId?: string) => void;
  onPreviewOption: (
    categoryId: string,
    optionId: string,
    zoneId?: string,
  ) => void;
  onSubmit: () => void;
};

function LookBookEntry({
  definition,
  configuration,
  item,
  onEditCategory,
  onPreviewOption,
  isFeatured,
}: Pick<
  HomeLookBookProps,
  | "definition"
  | "configuration"
  | "onEditCategory"
  | "onPreviewOption"
> & {
  item: HomeLookBookItem;
  isFeatured: boolean;
}) {
  const category = definition.categories.find(
    (candidate) => candidate.id === item.categoryId,
  );

  if (!category) return null;

  if (category.kind === "coordinated") {
    return (
      <article
        data-look-book-category={category.id}
        data-look-book-state="coordinated"
        className="flex min-h-64 flex-col justify-between border border-dashed border-black/18 bg-[#ded9cd] p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
            {item.label ?? category.title}
          </p>
          <BookOpen aria-hidden="true" className="size-4 text-black/58" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-2xl font-medium tracking-[-0.045em] text-black/76">
            {category.coordinatedMessage}
          </p>
          <p className="mt-4 text-xs leading-6 text-black/58">
            {category.description}
          </p>
        </div>
      </article>
    );
  }

  const option =
    category.kind === "standard"
      ? getSelectedStandardOption(category, configuration)
      : (() => {
          const zone = category.zones.find(
            (candidate) => candidate.id === item.zoneId,
          );
          return zone
            ? getSelectedFlooringOption(zone, configuration)
            : undefined;
        })();
  const isComplete = isCategoryComplete(category, configuration);
  const label = item.label ?? category.title;

  if (!option || !isComplete) {
    return (
      <article
        data-look-book-category={category.id}
        data-look-book-state="incomplete"
        className="flex min-h-64 flex-col justify-between border border-black/14 bg-black/[0.025] p-6 sm:p-8"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
          {label}
        </p>
        <div>
          <p className="text-2xl font-medium tracking-[-0.045em] text-black/58">
            Selection in progress
          </p>
          <button
            type="button"
            onClick={() => onEditCategory(category.id, item.zoneId)}
            className="mt-5 inline-flex min-h-10 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-black/52 transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Continue selection
            <ArrowRight aria-hidden="true" className="size-3" strokeWidth={1.5} />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      data-look-book-category={category.id}
      data-look-book-state="complete"
      className={
        isFeatured
          ? "flex min-w-0 flex-col overflow-hidden border border-black/14 bg-[#e7e3d8] md:col-span-2 xl:col-span-2"
          : "flex min-w-0 flex-col overflow-hidden border border-black/14 bg-[#e7e3d8]"
      }
    >
      <button
        type="button"
        id={`home-look-book-preview-trigger-${option.id}-${item.zoneId ?? category.id}`}
        aria-label={`View larger image for ${option.name}`}
        onClick={() =>
          onPreviewOption(category.id, option.id, item.zoneId)
        }
        className={
          isFeatured
            ? "group relative aspect-[16/10] overflow-hidden border-b border-black/12 bg-[#d6d1c5] text-left sm:aspect-[16/9]"
            : "group relative aspect-[4/3] overflow-hidden border-b border-black/12 bg-[#d6d1c5] text-left"
        }
      >
        <Image
          src={option.image.src}
          alt={option.image.alt}
          fill
          quality={90}
          sizes={
            isFeatured
              ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 100vw, 66vw"
              : "(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 50vw, 33vw"
          }
          className={
            option.image.fit === "contain"
              ? "object-contain"
              : "object-cover transition-transform duration-700 group-hover:scale-[1.012] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          }
        />
        <span className="absolute bottom-4 right-4 bg-black px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-white transition-colors group-hover:bg-white group-hover:text-black">
          View larger
        </span>
      </button>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-center justify-between gap-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
            {label}
          </p>
          <Check aria-label="Complete" className="size-3.5 text-black/58" strokeWidth={2} />
        </div>
        <h4 className="mt-7 text-[clamp(1.9rem,3vw,3rem)] font-medium leading-[0.94] tracking-[-0.055em] text-black/82">
          {option.name}
        </h4>
        {option.description ? (
          <p className="mt-5 text-sm leading-7 text-black/58">
            {option.description}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-black/12 pt-6">
          <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/58">
            {getHomeInclusionLevelLabel(option.level)}
          </p>
          <button
            type="button"
            onClick={() => onEditCategory(category.id, item.zoneId)}
            className="inline-flex min-h-10 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.17em] text-black/58 transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            <Pencil aria-hidden="true" className="size-3" strokeWidth={1.5} />
            Edit selection
          </button>
        </div>
      </div>
    </article>
  );
}

export function HomeLookBook({
  definition,
  configuration,
  designDirection,
  onEditCategory,
  onPreviewOption,
  onSubmit,
}: HomeLookBookProps) {
  const requiredCategories = getRequiredCategories(definition);
  const completeCount = requiredCategories.filter((category) =>
    isCategoryComplete(category, configuration),
  ).length;
  const isReady = completeCount === requiredCategories.length;
  const isSubmitted = configuration.reviewStatus === "ready-for-review";
  const firstIncompleteCategory = requiredCategories.find(
    (category) => !isCategoryComplete(category, configuration),
  );
  const openingImages = [
    definition.architecturalImages[0],
    designDirection.image,
    definition.architecturalImages[1],
  ].filter(Boolean);

  if (!isReady) {
    return (
      <section
        id="home-look-book"
        tabIndex={-1}
        aria-labelledby="home-look-book-heading"
        data-look-book-ready="false"
        data-review-status={configuration.reviewStatus}
        className="scroll-mt-20 bg-[#e7e3d8] px-5 py-24 text-[#111216] outline-none sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <HomeConfiguratorJourney
            currentStage="configure"
            theme="light"
            ariaLabel="Look Book journey preview"
            homeName={definition.homeName}
          />

          <div className="mt-16 grid gap-12 border-t border-black/18 pt-7 lg:mt-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
                My {definition.homeName} / Look Book preview
              </p>
              <h2
                id="home-look-book-heading"
                className="mt-7 text-[clamp(4rem,9vw,9rem)] font-medium leading-[0.82] tracking-[-0.075em] text-black/88"
              >
                Your story
                <br />
                <span className="text-black/52">takes shape here.</span>
              </h2>
            </div>
            <div className="max-w-xl lg:justify-self-end">
              <p className="text-base leading-8 text-black/60">
                Your selected home and interior direction will open into an editorial Look Book once every controlled chapter is confirmed.
              </p>
              <div className="mt-8 flex items-center gap-5">
                <div className="h-px flex-1 bg-black/14">
                  <div
                    className="h-px bg-black transition-[width] duration-500 motion-reduce:transition-none"
                    style={{
                      width: `${(completeCount / requiredCategories.length) * 100}%`,
                    }}
                  />
                </div>
                <p className="font-mono text-[9px] tracking-[0.14em] text-black/58">
                  {completeCount} / {requiredCategories.length}
                </p>
              </div>
              {firstIncompleteCategory ? (
                <button
                  type="button"
                  onClick={() => onEditCategory(firstIncompleteCategory.id)}
                  className="group mt-8 flex min-h-14 w-full items-center justify-between gap-7 bg-[#111216] px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-black/76 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
                >
                  <span>Continue with {firstIncompleteCategory.shortTitle}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="home-look-book"
      tabIndex={-1}
      aria-labelledby="home-look-book-heading"
      data-look-book-ready={isReady ? "true" : "false"}
      data-review-status={configuration.reviewStatus}
      className="scroll-mt-20 bg-[#e7e3d8] text-[#111216] outline-none"
    >
      <div className="border-b border-black/12 px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1504px]">
          <HomeConfiguratorJourney
            currentStage="look-book"
            theme="light"
            ariaLabel="Look Book journey"
            homeName={definition.homeName}
          />

          <div className="mt-16 grid gap-12 border-t border-black/18 pt-7 lg:mt-24 lg:grid-cols-[0.76fr_1.24fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
                Personalized architectural specification book
              </p>
              <h2
                id="home-look-book-heading"
                className="mt-7 text-[clamp(4.5rem,10vw,10rem)] font-medium uppercase leading-[0.78] tracking-[-0.08em]"
              >
                My
                <br />
                <span className="text-black/58">{definition.homeName}</span>
              </h2>
            </div>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-lg font-medium tracking-[-0.025em] text-black/68">
                Your selected home and interior direction
              </p>
              <p className="mt-3 text-3xl font-medium tracking-[-0.05em] text-black/84 sm:text-5xl">
                {designDirection.name}
              </p>
              <div className="mt-8 flex items-center gap-5">
                <div className="h-px flex-1 bg-black/14">
                  <div
                    className="h-px bg-black transition-[width] duration-500 motion-reduce:transition-none"
                    style={{
                      width: `${(completeCount / requiredCategories.length) * 100}%`,
                    }}
                  />
                </div>
                <p className="font-mono text-[9px] tracking-[0.14em] text-black/58">
                  {completeCount} / {requiredCategories.length} complete
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-3 sm:gap-5 lg:mt-24 lg:grid-cols-[1.25fr_0.75fr]">
            {openingImages.map((image, index) => (
              <div
                key={`${image.src}-${index}`}
                className={
                  index === 0
                    ? "relative col-span-2 aspect-[16/9] overflow-hidden bg-[#d4cfc3] lg:col-span-1 lg:row-span-2 lg:aspect-auto"
                    : "relative aspect-[4/3] overflow-hidden bg-[#d4cfc3]"
                }
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  quality={90}
                  sizes={
                    index === 0
                      ? "(max-width: 1023px) 100vw, 63vw"
                      : "(max-width: 1023px) 50vw, 37vw"
                  }
                  className={
                    "fit" in image && image.fit === "contain"
                      ? "object-contain"
                      : "object-cover"
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1504px]">
          <div className="border-t border-black/18 pt-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
              Look Book / {definition.lookBookChapters.length} chapters
            </p>
          </div>

          <div className="mt-20 grid gap-28 lg:gap-40">
            {definition.lookBookChapters.map((chapter) => (
              <section
                key={chapter.id}
                aria-labelledby={`look-book-${chapter.id}-heading`}
                data-look-book-chapter={chapter.id}
              >
                <div className="grid gap-7 border-t border-black/18 pt-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.16em] text-black/58">
                      Chapter {chapter.number} / {String(definition.lookBookChapters.length).padStart(2, "0")}
                    </p>
                    <h3
                      id={`look-book-${chapter.id}-heading`}
                      className="mt-5 text-[clamp(3.25rem,7vw,7.5rem)] font-medium leading-[0.86] tracking-[-0.075em] text-black/88"
                    >
                      {chapter.title}
                    </h3>
                  </div>
                  <p className="max-w-xl text-base leading-8 text-black/60 lg:justify-self-end lg:self-end">
                    {chapter.introduction}
                  </p>
                </div>

                <div className="mt-12 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {chapter.items.map((item, index) => (
                    <LookBookEntry
                      key={`${item.categoryId}-${item.zoneId ?? index}`}
                      definition={definition}
                      configuration={configuration}
                      item={item}
                      onEditCategory={onEditCategory}
                      onPreviewOption={onPreviewOption}
                      isFeatured={index === 0}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-28 max-w-4xl border-t border-black/16 pt-6 text-xs leading-6 text-black/58 lg:mt-40">
            {definition.disclaimer}
          </p>
        </div>
      </div>

      <div className="border-t border-black/14 bg-[#d8d2c5] px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 border-t border-black/20 pt-7 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:gap-24">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
                Final review / Working design brief
              </p>
              <h3 className="mt-7 max-w-5xl text-[clamp(3.8rem,8vw,8.5rem)] font-medium leading-[0.84] tracking-[-0.075em] text-black/88">
                Your {definition.homeName}
                <br />
                <span className="text-black/58">is taking shape.</span>
              </h3>
            </div>
            <div className="max-w-xl lg:justify-self-end">
              <p className="text-base leading-8 text-black/60">
                Your selections create the working design brief for your {definition.homeName} home. House Delivery will review the configuration, confirm project-specific products, availability and technical requirements, and coordinate the next design stage.
              </p>

              {isSubmitted ? (
                <div
                  role="status"
                  className="mt-8 border border-black/20 bg-[#e7e3d8] p-6"
                >
                  <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-black/68">
                    <Check aria-hidden="true" className="size-4" strokeWidth={2} />
                    My {definition.homeName} is ready for review
                  </p>
                  <p className="mt-4 text-xs leading-6 text-black/58">
                    This configuration is now represented in the application as a review-ready design brief. Project-system and supplier integrations will be connected separately.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  data-submit-home-review={definition.homeId}
                  disabled={!isReady}
                  onClick={onSubmit}
                  className="group mt-8 flex min-h-14 w-full items-center justify-between gap-7 bg-[#111216] px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-black/76 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-black/38"
                >
                  <span>
                    {isReady
                      ? `Submit My ${definition.homeName} for Review`
                      : `Complete ${requiredCategories.length - completeCount} remaining ${requiredCategories.length - completeCount === 1 ? "chapter" : "chapters"}`}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
