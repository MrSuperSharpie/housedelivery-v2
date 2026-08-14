import Image from "next/image";

import { HeadlineReveal } from "@/components/headline-reveal";
import { InclusionsFilmFeature } from "@/components/homepage-video-experiences";
import { RevealText } from "@/components/reveal-text";
import { TrustBanner } from "@/components/trust-banner";
import { inclusionPackages } from "@/data/inclusions";

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

const capabilityImages = [
  {
    number: "01",
    label: "Architecture, realized",
    src: "/images/homepage/capabilities/architecture-realized.jpg",
    alt: "Completed contemporary residence with broad glazing and warm timber detailing",
  },
  {
    number: "02",
    label: "Structure, engineered",
    src: "/images/homepage/capabilities/structure-engineered.webp",
    alt: "Engineered light-gauge steel frame forming a contemporary residence",
  },
  {
    number: "03",
    label: "Precision, assembled",
    src: "/images/homepage/capabilities/precision-assembled.jpg",
    alt: "Close view of precision fastening during steel-frame assembly",
  },
  {
    number: "04",
    label: "Automation, integrated",
    src: "/images/homepage/capabilities/automation-integrated.jpg",
    alt: "Industrial robotic arm moving panels through an automated manufacturing line",
  },
  {
    number: "05",
    label: "Manufacturing, refined",
    src: "/images/homepage/capabilities/manufacturing-refined.jpg",
    alt: "Computer-controlled manufacturing equipment operating inside a production facility",
  },
  {
    number: "06",
    label: "Interiors, completed",
    src: "/images/homepage/capabilities/interiors-completed.jpg",
    alt: "Completed contemporary interior with integrated cabinetry and living area",
  },
] as const;

const finishTierImages = {
  essential: "/images/homepage/finish-levels/essential-finish-level.jpg",
  premium: "/images/homepage/finish-levels/premium-finish-level.jpg",
  signature: "/images/homepage/finish-levels/signature-finish-level.jpg",
} as const;

type InclusionGridProps = {
  eyebrow?: string;
  introCopy?: string;
  headlinePrimary?: string;
  headlineSecondary?: string;
  scopeNote?: string;
};

export function InclusionGrid({
  eyebrow = "The complete package",
  introCopy = "Every House Delivery Inc. home arrives as a coordinated, certified system—documented, engineered, and finished to a single standard.",
  headlinePrimary = "Included with every",
  headlineSecondary = "delivered home.",
  scopeNote,
}: InclusionGridProps) {
  return (
    <section
      id="inclusions"
      className="scroll-mt-20 bg-[#0b0c10] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px]">
        <span
          id="certainty"
          className="block scroll-mt-20"
          aria-hidden="true"
        />
        <div className="mb-20 grid gap-8 border-t border-white/15 pt-7 md:grid-cols-2 lg:mb-28">
          <p className="eyebrow">{eyebrow}</p>
          <p className="max-w-lg text-base leading-7 text-white/48 md:justify-self-end">
            {introCopy}
            {scopeNote ? (
              <span className="mt-4 block text-sm leading-6 text-white/34">
                {scopeNote}
              </span>
            ) : null}
          </p>
        </div>

        <h2 className="max-w-[1200px] text-[clamp(2.9rem,7vw,7.5rem)] font-medium leading-[0.85] tracking-[-0.07em]">
          <RevealText text={headlinePrimary} />
          <br />
          <span className="text-white/40">
            <RevealText text={headlineSecondary} delay={0.12} />
          </span>
        </h2>

        <div className="mt-20 grid grid-cols-1 gap-x-12 md:grid-cols-2 lg:mt-28 lg:grid-cols-3">
          {inclusions.map((item) => (
            <article
              key={item.number}
              className="border-t border-white/10 pt-7 pb-12"
            >
              <span className="text-[10px] tracking-[0.2em] text-white/30">
                {item.number}
              </span>
              <h3 className="mt-6 max-w-xs text-xl font-medium leading-tight tracking-[-0.035em] text-white/85">
                {item.title}
              </h3>
              <ul className="mt-6 space-y-3">
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

      </div>
    </section>
  );
}

export function ModernMethodsSection() {
  return (
    <section className="bg-[#0b0c10] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1504px] border-t border-white/10 pt-8 lg:pt-10">
          <div className="mb-10 grid grid-cols-12 gap-y-6 sm:mb-12 lg:gap-x-8">
            <h3 className="col-span-12 max-w-[980px] text-[clamp(2.25rem,4.5vw,4.9rem)] font-medium leading-[0.92] tracking-[-0.06em] text-white/90 lg:col-span-9 lg:col-start-4">
              We&apos;re taking modern methods of construction to a whole new
              level.
            </h3>
            <p className="col-span-12 max-w-[860px] text-[clamp(1.25rem,2.1vw,2rem)] font-medium italic leading-[1.08] tracking-[-0.035em] text-white/62 lg:col-span-7 lg:col-start-6">
              “Prefab used to mean compromise. What we&apos;re building is the
              opposite — architectural quality, precision manufacturing, and
              real customization, with less waste, less time, and more
              savings.”
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-3 gap-y-10 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 lg:gap-x-8 lg:gap-y-14">
            {capabilityImages.map((image) => (
              <figure key={image.number} className="group">
                <div className="relative aspect-[16/10] overflow-hidden border border-white/10 bg-white/[0.035]">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    quality={90}
                    sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1023px) calc(50vw - 2.75rem), (max-width: 1599px) calc(50vw - 4rem), 736px"
                    style={{ imageRendering: "auto" }}
                    className="object-cover brightness-90 grayscale transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.025] group-hover:brightness-100 group-hover:grayscale-0"
                  />
                </div>
                <figcaption className="mt-3 flex items-start justify-between gap-3 border-t border-white/10 pt-3 text-[8px] uppercase leading-4 tracking-[0.16em] text-white/35 sm:mt-4 sm:text-[9px] sm:tracking-[0.2em]">
                  <span>{image.label}</span>
                  <span>{image.number} / 06</span>
                </figcaption>
              </figure>
            ))}
          </div>

        <TrustBanner compact />
      </div>
    </section>
  );
}

export function FinishesSection() {
  return (
    <section className="bg-[#0b0c10] px-5 pb-24 sm:px-8 lg:px-12 lg:pb-32">
      <div className="mx-auto max-w-[1504px] border-t border-white/10 pt-10 lg:pt-14">
          <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
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
                trigger="viewport"
              >
                <h3 className="max-w-5xl text-[clamp(2.8rem,6vw,6.8rem)] font-medium leading-[0.86] tracking-[-0.07em] text-white/90">
                  The final layer,
                  <br />
                  <span className="text-white/40">made personal.</span>
                </h3>
              </HeadlineReveal>

              <div className="mt-10 border-t border-white/10 pt-8">
                <p className="max-w-2xl text-lg leading-8 text-white/70">
                  Flooring. Glazing. Doors. Cabinetry. Every finish, organized
                  through one coordinated package structure.
                </p>
              </div>

              <InclusionsFilmFeature />

              <div className="mt-10 grid grid-cols-12 border-y border-white/10">
                {inclusionPackages.map((tier) => (
                  <div
                    key={tier.id}
                    role="group"
                    tabIndex={0}
                    aria-label={`${tier.name} finish tier`}
                    aria-describedby={`finish-tier-message-${tier.id}`}
                    className="group relative col-span-12 grid min-h-44 grid-cols-[32px_minmax(0,1fr)] gap-x-4 overflow-hidden border-b border-white/10 px-4 py-6 last:border-b-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/50 sm:col-span-4 sm:block sm:min-h-56 sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-6 sm:last:border-r-0 sm:last:pr-6"
                  >
                    <div className="absolute inset-0 opacity-45 transition-opacity duration-[350ms] ease-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-80 [@media(hover:hover)_and_(pointer:fine)]:group-focus-visible:opacity-80">
                      <Image
                        src={finishTierImages[tier.id]}
                        alt=""
                        fill
                        quality={82}
                        sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1599px) 33vw, 488px"
                        className="object-cover transition-transform duration-[350ms] ease-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:scale-[1.015] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-visible:scale-100"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80"
                      />
                    </div>

                    <span className="relative z-10 pt-1 text-[10px] tabular-nums tracking-[0.18em] text-white/55 sm:pt-0">
                      {tier.number}
                    </span>
                    <div className="relative z-10 sm:mt-7">
                      <p className="text-2xl font-medium tracking-[-0.035em] text-white/90">
                        {tier.name}
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/60">
                        {tier.positioning}
                      </p>
                      <p
                        id={`finish-tier-message-${tier.id}`}
                        className="mt-3 text-[10px] leading-4 tracking-[0.04em] text-white/60 opacity-100 transition-opacity duration-[350ms] ease-out motion-reduce:transition-none [@media(min-width:640px)_and_(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(min-width:640px)_and_(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(min-width:640px)_and_(hover:hover)_and_(pointer:fine)]:group-focus-visible:opacity-100"
                      >
                        {tier.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm leading-6 text-white/50">
                Pre-approved residences arrive specified in Premium—durable by
                default.
              </p>
            </div>
          </div>
      </div>
    </section>
  );
}
