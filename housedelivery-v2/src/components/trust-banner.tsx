import { HeadlineReveal } from "@/components/headline-reveal";

const certifications = [
  {
    mark: "BUILDING CODE",
    name: "NBC / Provincial Codes",
    discipline: "Applicable Canadian building requirements",
  },
  {
    mark: "CSA",
    name: "CSA S136",
    discipline: "Cold-formed steel structural design",
  },
  {
    mark: "CSA",
    name: "CSA A277",
    discipline: "Prefabricated buildings, modules & panels — where applicable",
  },
  {
    mark: "NAFS",
    name: "NAFS / CSA A440 Series",
    discipline: "Window & exterior door performance",
  },
  {
    mark: "CSA / ULC / cUPC",
    name: "Product Approvals",
    discipline: "Safety, fire & plumbing — as applicable",
  },
] as const;

type TrustBannerProps = {
  compact?: boolean;
};

export function TrustBanner({ compact = false }: TrustBannerProps) {
  return (
    <div
      role="region"
      aria-labelledby="trust-heading"
      className={
        compact
          ? "mt-16 border-t border-white/10 pt-8 lg:mt-24"
          : "border-b border-[#1f2833] bg-[#0e1014] px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
      }
    >
      <div className={compact ? undefined : "mx-auto max-w-[1504px]"}>
        <div
          className={
            compact
              ? "grid gap-6 border-b border-white/12 pb-7 sm:grid-cols-[1fr_auto] sm:items-end"
              : "grid gap-7 border-b border-white/12 pb-9 sm:grid-cols-[1fr_auto] sm:items-end"
          }
        >
          <div>
            <p className="eyebrow">Trust &amp; certifications</p>
            <HeadlineReveal
              variant={compact ? "clip" : "sweep"}
              className="mt-5"
            >
              <h2
                id="trust-heading"
                className={
                  compact
                    ? "text-2xl font-medium tracking-[-0.045em] sm:text-3xl"
                    : "text-3xl font-medium tracking-[-0.045em] sm:text-4xl"
                }
              >
                Canadian Standards.{" "}
                <span className="text-white/38">
                  Project-Specific Compliance.
                </span>
              </h2>
            </HeadlineReveal>
          </div>
          <p className="max-w-sm text-[10px] uppercase leading-5 tracking-[0.17em] text-white/30 sm:text-right">
            Products and systems are reviewed against applicable Canadian
            codes, standards and project-specific requirements.
          </p>
        </div>

        <div className="grid grid-cols-2 border-l border-white/12 lg:grid-cols-3 xl:grid-cols-5">
          {certifications.map((certification) => (
            <article
              key={certification.name}
              className={
                compact
                  ? "group flex min-h-32 flex-col justify-between border-b border-r border-white/12 p-4 transition-colors hover:bg-white/[0.035] sm:p-5"
                  : "group flex min-h-44 flex-col justify-between border-b border-r border-white/12 p-5 transition-colors hover:bg-white/[0.035] sm:p-6"
              }
            >
              <span
                className={
                  compact
                    ? "text-xl font-medium tracking-[-0.055em] text-white/28 transition-colors group-hover:text-white/60"
                    : "text-2xl font-medium tracking-[-0.055em] text-white/28 transition-colors group-hover:text-white/60"
                }
              >
                {certification.mark}
              </span>
              <div className={compact ? "mt-6" : "mt-10"}>
                <h3 className="text-sm font-medium leading-5 text-white/72">
                  {certification.name}
                </h3>
                <p className="mt-2 text-[8px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/28">
                  {certification.discipline}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
