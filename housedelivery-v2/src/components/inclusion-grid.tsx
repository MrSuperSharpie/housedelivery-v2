import { ArrowUpRight } from "lucide-react";

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

const finishTiers = [
  {
    number: "01",
    name: "Entry",
    note: "Essential edit",
  },
  {
    number: "02",
    name: "Premium",
    note: "Pre-approved standard",
  },
  {
    number: "03",
    name: "Signature",
    note: "Fully tailored",
  },
] as const;

export function InclusionGrid() {
  return (
    <section
      id="inclusions"
      className="scroll-mt-20 bg-[#0b0c10] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="mb-20 grid gap-8 border-t border-white/15 pt-7 md:grid-cols-2 lg:mb-28">
          <p className="eyebrow">The complete package</p>
          <p className="max-w-lg text-base leading-7 text-white/48 md:justify-self-end">
            Every House Delivery Inc. home arrives as a coordinated, certified
            system—documented, engineered, and finished to a single standard.
          </p>
        </div>

        <h2 className="max-w-[1200px] text-[clamp(2.9rem,7vw,7.5rem)] font-medium leading-[0.85] tracking-[-0.07em]">
          Included with every
          <br />
          <span className="text-white/40">delivered home.</span>
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

        <div className="mt-24 border-t border-white/10 pt-10 lg:mt-40 lg:pt-14">
          <div className="grid grid-cols-12 gap-y-12 lg:gap-x-8">
            <div className="col-span-12 lg:col-span-3">
              <p className="eyebrow">Finishes / Private folio</p>
              <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-white/30">
                Three considered expressions
              </p>
            </div>

            <div className="col-span-12 lg:col-span-9 lg:col-start-4">
              <h3 className="max-w-5xl text-[clamp(2.8rem,6vw,6.8rem)] font-medium leading-[0.86] tracking-[-0.07em] text-white/90">
                The final layer,
                <br />
                <span className="text-white/40">made personal.</span>
              </h3>

              <div className="mt-12 grid grid-cols-12 gap-y-10 border-t border-white/10 pt-8 lg:gap-x-8">
                <p className="col-span-12 max-w-2xl text-lg leading-8 text-white/70 lg:col-span-7">
                  Flooring. Glazing. Doors. Cabinetry. Every finish, collected in
                  one private design folio.
                </p>

                <a
                  href="#reserve"
                  className="group col-span-12 inline-flex w-fit items-center gap-4 self-start border-b border-white/35 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 transition-colors duration-500 hover:border-white hover:text-white lg:col-span-4 lg:col-start-9"
                >
                  Request the finishes folio
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.5}
                  />
                </a>
              </div>

              <div className="mt-14 grid grid-cols-12 border-y border-white/10">
                {finishTiers.map((tier) => (
                  <div
                    key={tier.name}
                    className="col-span-12 flex items-end justify-between border-b border-white/10 py-6 last:border-b-0 sm:col-span-4 sm:block sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
                  >
                    <span className="text-[10px] tabular-nums tracking-[0.18em] text-white/30">
                      {tier.number}
                    </span>
                    <p className="mt-7 text-2xl font-medium tracking-[-0.035em] text-white/90">
                      {tier.name}
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
                      {tier.note}
                    </p>
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
      </div>
    </section>
  );
}
