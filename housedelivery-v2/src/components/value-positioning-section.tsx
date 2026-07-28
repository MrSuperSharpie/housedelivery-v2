import { HeadlineReveal } from "@/components/headline-reveal";
import { ScrollReveal } from "@/components/scroll-reveal";

const outcomes = [
  {
    number: "01",
    title: "Keep more value in the home.",
    description:
      "A coordinated component package reduces fragmented purchasing, duplicated markups, rushed decisions, and avoidable waste. The result is a clearer path to exceptional design without accepting the traditional cost structure.",
  },
  {
    number: "02",
    title: "Move from planning to progress sooner.",
    description:
      "More decisions are resolved before materials reach the site. Components, documentation, and specifications arrive as one coordinated system, helping local construction move with greater speed and certainty.",
  },
  {
    number: "03",
    title: "Quality, already coordinated.",
    description:
      "Structure, windows, doors, cabinetry, flooring, finishes, and essential components are selected to work together—creating a home that feels considered, complete, and built for long-term value.",
  },
] as const;

export function ValuePositioningSection() {
  return (
    <section
      id="value"
      aria-labelledby="proposed-value-heading"
      className="scroll-mt-20 bg-[#0b0c10] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid grid-cols-12 gap-y-12 border-t border-white/12 pt-7 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">
            A different way to build
          </p>
          <HeadlineReveal className="col-span-12 lg:col-span-9 lg:col-start-4">
            <h2
              id="proposed-value-heading"
              className="max-w-[1280px] text-[clamp(3.25rem,7.3vw,8rem)] font-medium leading-[0.84] tracking-[-0.072em] text-white/90"
            >
              The home you thought
              <br />
              was out of reach
              <br />
              <span className="text-white/38">
                may be closer than you think.
              </span>
            </h2>
          </HeadlineReveal>
          <p className="col-span-11 max-w-2xl text-lg leading-8 text-white/68 sm:col-span-8 sm:col-start-4 lg:col-span-5 lg:col-start-8">
            House Delivery brings structure, finishes, documentation, and
            delivery into one coordinated kit of parts—designed to reduce
            construction waste, shorten on-site timelines, and put more of your
            investment into the home itself.
          </p>
        </div>

        <div className="mt-24 grid border-y border-white/12 lg:mt-36 lg:grid-cols-3">
          {outcomes.map((outcome, index) => (
            <ScrollReveal
              key={outcome.number}
              delay={index * 0.1}
              clip={false}
              className={
                index > 0
                  ? "border-t border-white/12 lg:border-l lg:border-t-0"
                  : ""
              }
            >
              <article className="flex min-h-[390px] flex-col justify-between px-1 py-10 sm:px-8 lg:min-h-[460px] lg:px-10 lg:py-12">
                <span className="text-[10px] tracking-[0.2em] text-white/28">
                  {outcome.number}
                </span>
                <div className="mt-20">
                  <h3 className="max-w-md text-[clamp(2rem,3.2vw,3.7rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/88">
                    {outcome.title}
                  </h3>
                  <p className="mt-7 max-w-md text-sm leading-7 text-white/50">
                    {outcome.description}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
