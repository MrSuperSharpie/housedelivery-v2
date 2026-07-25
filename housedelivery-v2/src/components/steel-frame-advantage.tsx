import Image from "next/image";

import { HeadlineReveal } from "@/components/headline-reveal";

type Advantage = {
  number: string;
  kicker: string;
  body: string;
};

type SteelImage = {
  number: string;
  label: string;
  src: string;
  alt: string;
  ratio: string;
  placement: string;
};

const advantages: readonly Advantage[] = [
  {
    number: "01",
    kicker: "Move in sooner",
    body: "Factory-cut. Numbered. Ready to assemble. Less weather. Less waiting. More life, sooner.",
  },
  {
    number: "02",
    kicker: "Keep more value",
    body: "Less labour. Less waste. Fewer surprises. Premium architecture without the traditional construction premium.",
  },
  {
    number: "03",
    kicker: "Own with confidence",
    body: "No warping. No shrinking. Engineered for snow, wind, seismic loads—and decades of ownership.",
  },
  {
    number: "04",
    kicker: "Build lighter",
    body: "Recyclable steel. Precise material use. A quieter site and a lighter construction footprint.",
  },
  {
    number: "05",
    kicker: "Live more openly",
    body: "Longer spans. Open rooms. Architecture that feels generous because every square foot works harder.",
  },
];

const steelImages: readonly SteelImage[] = [
  {
    number: "01",
    label: "Structure, multiplied",
    src: "/Row Housing.jpg",
    alt: "Light steel framing rising across a multi-home row housing project",
    ratio: "aspect-[16/9]",
    placement: "lg:col-span-8 lg:col-start-1",
  },
  {
    number: "02",
    label: "Form, completed",
    src: "/Row Housing 2.jpg",
    alt: "Completed contemporary row homes built with light steel framing",
    ratio: "aspect-[16/9]",
    placement: "lg:col-span-4 lg:col-start-9 lg:self-end",
  },
  {
    number: "03",
    label: "Architecture, realized",
    src: "/Cedar View 1.jpg",
    alt: "Completed Cedar View residence with expansive glazing and sheltered outdoor space",
    ratio: "aspect-[16/9]",
    placement: "lg:col-span-5 lg:col-start-2 lg:mt-24",
  },
  {
    number: "04",
    label: "Precision beneath",
    src: "/Cedar View Steel Frame.jpg",
    alt: "Cedar View residence revealed as a precision light steel frame",
    ratio: "aspect-[2/1]",
    placement: "lg:col-span-6 lg:col-start-7 lg:mt-36",
  },
];

export function SteelFrameAdvantage() {
  return (
    <section
      id="steel-frame"
      className="scroll-mt-20 bg-[#0B0C10] px-5 py-32 sm:px-8 lg:px-12 lg:py-44"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">
            The structure / Light steel frame
          </p>
          <HeadlineReveal className="col-span-12 lg:col-span-9 lg:col-start-4">
            <h2 className="max-w-[1200px] text-[clamp(3.5rem,8vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90">
              Less construction.
              <br />
              <span className="text-white/38">More home.</span>
            </h2>
          </HeadlineReveal>
          <p className="col-span-10 col-start-3 max-w-xl border-l border-white/10 pl-6 text-lg leading-8 text-white/70 sm:col-span-7 sm:col-start-6 lg:col-span-4 lg:col-start-9">
            Precision is the discount. Speed is the luxury. Quality is the part
            you keep.
          </p>
        </div>

        <div className="mt-28 grid grid-cols-12 gap-x-3 gap-y-16 lg:mt-40 lg:gap-y-0">
          {steelImages.map((image) => (
            <figure
              key={image.number}
              className={`group col-span-12 ${image.placement}`}
            >
              <div
                className={`relative ${image.ratio} overflow-hidden border border-white/10 bg-white/[0.035]`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  quality={100}
                  unoptimized={true}
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  className="object-contain brightness-90 grayscale transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.025] group-hover:brightness-100 group-hover:grayscale-0"
                />
              </div>
              <figcaption className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.2em] text-white/35">
                <span>{image.label}</span>
                <span>{image.number} / 04</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-32 border-t border-white/10 lg:mt-48">
          {advantages.map((advantage) => (
            <article
              key={advantage.number}
              className="grid grid-cols-12 gap-y-7 border-b border-white/10 py-10 sm:py-12 lg:gap-x-8 lg:py-14"
            >
              <span className="col-span-2 text-[10px] tracking-[0.2em] text-white/28 lg:col-span-1">
                {advantage.number}
              </span>
              <h3 className="col-span-10 text-[clamp(2rem,4vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.06em] text-white/88 lg:col-span-4 lg:col-start-3">
                {advantage.kicker}
              </h3>
              <p className="col-span-10 col-start-3 max-w-xl text-base leading-7 text-white/62 lg:col-span-4 lg:col-start-8 lg:self-end lg:text-lg lg:leading-8">
                {advantage.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
