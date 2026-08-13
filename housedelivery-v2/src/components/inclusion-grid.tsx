import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import { RevealText } from "@/components/reveal-text";
import { inclusionPackages } from "@/data/inclusions";
import { cn } from "@/lib/cn";

type InclusionItem = {
  number: string;
  title: string;
  points: readonly string[];
};

const inclusions: readonly InclusionItem[] = [
  {
    number: "01",
    title: "Plans & Documentation",
    points: [
      "Certified structural & architectural drawings",
      "Shop drawings",
      "Installation manuals",
    ],
  },
  {
    number: "02",
    title: "Structural Steel Frame System",
    points: [
      "Pre-engineered light-gauge galvanized steel",
      "Factory-formed trusses",
      "Seismic & snow-load compliant",
    ],
  },
  {
    number: "03",
    title: "Architectural Roofing Assembly",
    points: [
      "Corrugated & standing-seam metal roofing",
      "Matched fascia & gutters",
      "Thermal sarking barrier",
    ],
  },
  {
    number: "04",
    title: "Exterior Cladding",
    points: [
      "Fibre-cement, composite, or insulated panels",
      "Structural lintels",
      "Weather-resistant barrier",
    ],
  },
  {
    number: "05",
    title: "Windows & External Doors",
    points: [
      "High-performance double-glazed aluminium windows",
      "Feature entry door",
    ],
  },
  {
    number: "06",
    title: "Insulation — Energy Performance",
    points: [
      "Optimized R-values for regional climates",
      "Vapour barriers",
      "Optional closed-cell foam",
    ],
  },
  {
    number: "07",
    title: "Interior Finishes",
    points: [
      "Plasterboard panels",
      "Villaboard in wet areas",
      "90mm cornices",
      "Pre-hung interior doors",
    ],
  },
  {
    number: "08",
    title: "Kitchen & Wet Areas",
    points: [
      "Premium modular kitchen with soft-close",
      "Waterproof membrane kits",
    ],
  },
  {
    number: "09",
    title: "Electrical & Mechanical Provisions",
    points: [
      "Pre-routed conduits",
      "Optional solar-ready & heat-pump connections",
      "LED packages",
    ],
  },
  {
    number: "10",
    title: "Sustainability & Resilience",
    points: [
      "Recyclable materials",
      "Net Zero Ready",
      "Resistant to mold & fire",
    ],
  },
  {
    number: "11",
    title: "Optional Additions",
    points: [
      "Canadian appliance & HVAC packages",
      "CSA A277 certification",
      "Custom finishes",
    ],
  },
  {
    number: "12",
    title: "Furniture & Lifestyle Package",
    points: [
      "Optional turnkey packages",
      "Designed for comfort, urban, or remote installations",
    ],
  },
];

const systemImages = [
  {
    number: "01",
    label: "Structure, multiplied",
    src: "/Row Housing.jpg",
    alt: "Light steel framing rising across a multi-home row housing project",
    ratio: "aspect-[16/9]",
  },
  {
    number: "02",
    label: "Form, completed",
    src: "/Row Housing 2.jpg",
    alt: "Completed contemporary row homes built with light steel framing",
    ratio: "aspect-[16/9]",
  },
  {
    number: "03",
    label: "Architecture, realized",
    src: "/Cedar View 1.jpg",
    alt: "Completed Cedar View residence with expansive glazing and sheltered outdoor space",
    ratio: "aspect-[16/9]",
  },
  {
    number: "04",
    label: "Precision beneath",
    src: "/Cedar View Steel Frame.jpg",
    alt: "Cedar View residence revealed as a precision light steel frame",
    ratio: "aspect-[2/1]",
  },
] as const;

type InclusionGridProps = {
  eyebrow?: string;
  editorialCopy?: string;
  finishesVariant?: "default" | "compact";
  introCopy?: string;
  headlinePrimary?: string;
  headlineSecondary?: string;
  scopeNote?: string;
};

export function InclusionGrid({
  eyebrow = "The complete package",
  editorialCopy,
  finishesVariant = "default",
  introCopy = "Every House Delivery Inc. home arrives as a coordinated, certified system—documented, engineered, and finished to a single standard.",
  headlinePrimary = "Included with every",
  headlineSecondary = "delivered home.",
  scopeNote,
}: InclusionGridProps) {
  const hasCompactFinishes = finishesVariant === "compact";

  return (
    <section
      id="inclusions"
      className={
        hasCompactFinishes
          ? "scroll-mt-20 bg-[#0b0c10] px-5 pt-24 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pt-32 lg:pb-24"
          : "scroll-mt-20 bg-[#0b0c10] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
      }
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="mb-16 grid grid-cols-12 gap-y-8 border-t border-white/15 pt-7 lg:mb-24 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">{eyebrow}</p>
          <div className="col-span-12 lg:col-span-9 lg:col-start-4">
            {editorialCopy ? (
              <p className="max-w-[920px] text-[clamp(1.7rem,2.35vw,2.25rem)] font-medium leading-[1.04] tracking-[-0.045em] text-white/80">
                {editorialCopy}
              </p>
            ) : null}
            <p
              className={cn(
                "max-w-2xl text-base leading-7 text-white/48",
                editorialCopy &&
                  "mt-7 border-t border-white/10 pt-6 lg:ml-auto lg:max-w-xl",
              )}
            >
              {introCopy}
              {scopeNote ? (
                <span className="mt-4 block text-sm leading-6 text-white/34">
                  {scopeNote}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <h2 className="max-w-[1200px] text-[clamp(2.9rem,7vw,7.5rem)] font-medium leading-[0.85] tracking-[-0.07em]">
          <RevealText text={headlinePrimary} />
          <br />
          <span className="text-white/40">
            <RevealText text={headlineSecondary} delay={0.12} />
          </span>
        </h2>

        <div
          className={
            hasCompactFinishes
              ? "mt-16 grid grid-cols-1 gap-x-12 md:grid-cols-2 lg:mt-24 lg:grid-cols-3"
              : "mt-20 grid grid-cols-1 gap-x-12 md:grid-cols-2 lg:mt-28 lg:grid-cols-3"
          }
        >
          {inclusions.map((item) => (
            <article
              key={item.number}
              className={
                hasCompactFinishes
                  ? "border-t border-white/10 pt-5 pb-8"
                  : "border-t border-white/10 pt-7 pb-12"
              }
            >
              <span className="text-[10px] tracking-[0.2em] text-white/30">
                {item.number}
              </span>
              <h3
                className={`max-w-xs text-xl font-medium leading-tight tracking-[-0.035em] text-white/85 ${
                  hasCompactFinishes ? "mt-4" : "mt-6"
                }`}
              >
                {item.title}
              </h3>
              <ul
                className={
                  hasCompactFinishes
                    ? "mt-4 space-y-2"
                    : "mt-6 space-y-3"
                }
              >
                {item.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3.5 text-sm leading-6 text-white/45"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[11px] h-px w-3 shrink-0 bg-white/25"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 lg:mt-16 lg:pt-10">
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
            {systemImages.map((image) => (
              <figure key={image.number} className="group">
                <div
                  className={`relative ${image.ratio} overflow-hidden border border-white/10 bg-white/[0.035]`}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    quality={90}
                    sizes="(max-width: 639px) calc(50vw - 1.625rem), (max-width: 1023px) calc(50vw - 2.75rem), (max-width: 1599px) calc(50vw - 4rem), 736px"
                    style={{ imageRendering: "auto" }}
                    className="object-contain brightness-90 grayscale transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.025] group-hover:brightness-100 group-hover:grayscale-0"
                  />
                </div>
                <figcaption className="mt-3 flex items-start justify-between gap-3 border-t border-white/10 pt-3 text-[8px] uppercase leading-4 tracking-[0.16em] text-white/35 sm:mt-4 sm:text-[9px] sm:tracking-[0.2em]">
                  <span>{image.label}</span>
                  <span>{image.number} / 04</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div
          className={
            hasCompactFinishes
              ? "mt-16 border-t border-white/10 pt-8 lg:mt-24 lg:pt-10"
              : "mt-24 border-t border-white/10 pt-10 lg:mt-40 lg:pt-14"
          }
        >
          <div
            className={
              hasCompactFinishes
                ? "grid grid-cols-12 gap-y-8 lg:gap-x-8"
                : "grid grid-cols-12 gap-y-12 lg:gap-x-8"
            }
          >
            <div className="col-span-12 lg:col-span-3">
              <p className="eyebrow !text-white/45">
                Finishes / Inclusions Library
              </p>
              <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Three considered expressions
              </p>
            </div>

            <div className="col-span-12 lg:col-span-9 lg:col-start-4">
              <HeadlineReveal
                variant="sweep"
                trigger={hasCompactFinishes ? "mount" : "viewport"}
              >
                <h3 className="max-w-5xl text-[clamp(2.8rem,6vw,6.8rem)] font-medium leading-[0.86] tracking-[-0.07em] text-white/90">
                  The final layer,
                  <br />
                  <span className="text-white/40">made personal.</span>
                </h3>
              </HeadlineReveal>

              <div
                className={
                  hasCompactFinishes
                    ? "mt-8 grid grid-cols-12 gap-y-8 border-t border-white/10 pt-6 lg:gap-x-8"
                    : "mt-12 grid grid-cols-12 gap-y-10 border-t border-white/10 pt-8 lg:gap-x-8"
                }
              >
                <p className="col-span-12 max-w-2xl text-lg leading-8 text-white/70 lg:col-span-7">
                  Flooring. Glazing. Doors. Cabinetry. Every finish, organized
                  through one coordinated package structure.
                </p>

                <Link
                  href="/inclusions"
                  className="group col-span-12 inline-flex w-fit items-center gap-4 self-start border-b border-white/35 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 transition-colors duration-500 hover:border-white hover:text-white lg:col-span-4 lg:col-start-9"
                >
                  Explore the Inclusions Library
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.5}
                  />
                </Link>
              </div>

              <div
                className={
                  hasCompactFinishes
                    ? "mt-10 grid grid-cols-12 border-y border-white/10"
                    : "mt-14 grid grid-cols-12 border-y border-white/10"
                }
              >
                {inclusionPackages.map((tier) =>
                  hasCompactFinishes ? (
                    <div
                      key={tier.id}
                      role="group"
                      tabIndex={0}
                      aria-label={`${tier.name} finish tier`}
                      aria-describedby={`finish-tier-message-${tier.id}`}
                      className="group col-span-12 grid grid-cols-[32px_minmax(0,1fr)] gap-x-4 border-b border-white/10 py-6 last:border-b-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/35 sm:col-span-4 sm:block sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
                    >
                      <span className="pt-1 text-[10px] tabular-nums tracking-[0.18em] text-white/30 sm:pt-0">
                        {tier.number}
                      </span>
                      <div className="sm:mt-7">
                        <p className="text-2xl font-medium tracking-[-0.035em] text-white/90">
                          {tier.name}
                        </p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
                          {tier.positioning}
                        </p>
                        <p
                          id={`finish-tier-message-${tier.id}`}
                          className="mt-3 text-[10px] leading-4 tracking-[0.04em] text-white/45 opacity-100 transition-opacity duration-500 ease-out motion-reduce:transition-none [@media(min-width:640px)_and_(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(min-width:640px)_and_(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(min-width:640px)_and_(hover:hover)_and_(pointer:fine)]:group-focus-visible:opacity-100"
                        >
                          {tier.description}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={tier.id}
                      className="col-span-12 flex items-end justify-between border-b border-white/10 py-6 last:border-b-0 sm:col-span-4 sm:block sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
                    >
                      <span className="text-[10px] tabular-nums tracking-[0.18em] text-white/30">
                        {tier.number}
                      </span>
                      <p className="mt-7 text-2xl font-medium tracking-[-0.035em] text-white/90">
                        {tier.name}
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
                        {tier.positioning}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <p className="mt-6 text-sm leading-6 text-white/50">
                Pre-approved residences arrive specified in Premium—durable by
                default.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
