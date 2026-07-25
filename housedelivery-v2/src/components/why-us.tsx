import { Clock3, Landmark, Sparkles } from "lucide-react";

import { HeadlineReveal } from "@/components/headline-reveal";

const financingPoints = [
  "Defined project scope",
  "Lender-facing documentation",
  "Coordinated financing pathways",
] as const;

export function WhyUs() {
  return (
    <section
      id="why-us"
      aria-labelledby="why-us-heading"
      className="scroll-mt-20 border-y border-[#1f2833] bg-[#0b0c10] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-12 border-b border-white/14 pb-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20 lg:pb-20">
          <div>
            <p className="eyebrow">Why House Delivery Inc.</p>
            <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-white/28">
              Three systems / One pathway
            </p>
          </div>
          <div>
            <HeadlineReveal>
              <h2
                id="why-us-heading"
                className="max-w-5xl text-[clamp(3rem,6vw,6.8rem)] font-medium leading-[0.9] tracking-[-0.065em]"
              >
                Fewer unknowns.
                <br />
                <span className="text-white/38">More forward motion.</span>
              </h2>
            </HeadlineReveal>
          </div>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-12">
          <article className="flex min-h-[560px] flex-col justify-between bg-white p-7 text-[#0b0c10] sm:p-10 lg:col-span-7 lg:min-h-[650px] xl:p-14">
            <div className="flex items-start justify-between gap-8">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40">
                  01 / Building Faster, Smarter
                </p>
                <h3 className="mt-6 max-w-xl text-4xl font-medium leading-[0.96] tracking-[-0.055em] sm:text-6xl">
                  A controlled sequence replaces construction uncertainty.
                </h3>
              </div>
              <Clock3 size={25} strokeWidth={1.25} aria-hidden="true" />
            </div>

            <div>
              <div className="flex items-end gap-4">
                <span className="text-[clamp(6.5rem,13vw,12rem)] font-medium leading-[0.72] tracking-[-0.085em]">
                  120
                </span>
                <span className="pb-2 text-[10px] font-semibold uppercase leading-5 tracking-[0.18em] text-black/45">
                  Days
                  <br />
                  target sequence
                </span>
              </div>
              <div className="mt-12 grid gap-7 border-t border-black/18 pt-8 sm:grid-cols-2">
                <p className="text-sm leading-6 text-black/58">
                  Factory-controlled production and coordinated site assembly
                  compress the open-ended schedule associated with traditional
                  construction.
                </p>
                <p className="text-sm leading-6 text-black/58">
                  A defined component package and coordinated scope create
                  stronger fixed-cost certainty before production begins.
                </p>
              </div>
            </div>
          </article>

          <article className="flex min-h-[560px] flex-col justify-between border border-[#1f2833] bg-[#0e1014] p-7 sm:p-10 lg:col-span-5 lg:min-h-[650px] xl:p-14">
            <div>
              <div className="flex items-start justify-between gap-8">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
                  02 / Funding &amp; Financing
                </p>
                <Landmark
                  size={25}
                  strokeWidth={1.25}
                  className="text-white/42"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-10 max-w-lg text-4xl font-medium leading-[0.96] tracking-[-0.055em] sm:text-6xl">
                A clearer project is easier to finance.
              </h3>
              <p className="mt-7 max-w-lg text-sm leading-7 text-white/48">
                We simplify the pathway by aligning design, scope, engineering,
                budget context, and delivery documentation into one more
                legible project record for financing conversations.
              </p>
            </div>

            <div className="mt-16">
              {financingPoints.map((point, index) => (
                <div
                  key={point}
                  className="grid grid-cols-[36px_1fr] border-t border-white/13 py-5 text-xs text-white/62"
                >
                  <span className="text-[9px] tracking-[0.18em] text-white/25">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="overflow-hidden border border-[#1f2833] bg-[#0e1014] lg:col-span-12">
            <div className="grid lg:grid-cols-[0.7fr_1.3fr]">
              <div className="flex min-h-[430px] flex-col justify-between p-7 sm:p-10 lg:min-h-0 xl:p-14">
                <div className="flex items-start justify-between gap-8">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    03 / Interior Excellence
                  </p>
                  <Sparkles
                    size={23}
                    strokeWidth={1.25}
                    className="text-white/42"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-16">
                  <h3 className="max-w-xl text-4xl font-medium leading-[0.96] tracking-[-0.055em] sm:text-6xl">
                    Tailored Living:
                    <br />
                    <span className="text-white/38">
                      Interiors That Reflect You.
                    </span>
                  </h3>
                  <p className="mt-7 max-w-md text-sm leading-7 text-white/46">
                    Explore adaptable layouts, material palettes, finish
                    selections, and carefully proportioned spaces designed
                    around the way you live.
                  </p>
                </div>
              </div>

              <div className="aspect-video bg-black lg:min-h-[560px] lg:aspect-auto">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/G2ti9kw-A3A?rel=0&modestbranding=1&playsinline=1"
                  title="Tailored Living: Interiors That Reflect You"
                  className="size-full border-0"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
