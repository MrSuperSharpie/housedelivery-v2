import Image from "next/image";

type Pillar = {
  number: string;
  kicker: string;
  title: string;
  body: string;
};

const pillars: readonly Pillar[] = [
  {
    number: "01",
    kicker: "Ownership",
    title: "A front door changes everything.",
    body: "Roots. Belonging. Pride. The quiet confidence of a place that is yours.",
  },
  {
    number: "02",
    kicker: "Value",
    title: "Exceptional should feel attainable.",
    body: "High-quality homes. Less waste. Less delay. More of your money left for living.",
  },
  {
    number: "03",
    kicker: "Community",
    title: "Build with people. Build for permanence.",
    body: "First Nations-owned. Partnership-led. Local work, lasting skills, and homes made with meaning.",
  },
];

export function FounderMission() {
  return (
    <section
      id="mission"
      className="scroll-mt-20 bg-[#0b0c10] px-5 py-32 sm:px-8 lg:px-12 lg:py-44"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">
            Our story / House Delivery Inc.
          </p>
          <h2 className="col-span-12 max-w-[1250px] text-[clamp(3.5rem,8vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90 lg:col-span-9 lg:col-start-4">
            A home is where
            <br />
            <span className="text-white/38">belonging begins.</span>
          </h2>
          <p className="col-span-10 col-start-3 max-w-xl border-l border-white/10 pl-6 text-lg leading-8 text-white/70 sm:col-span-7 sm:col-start-6 lg:col-span-4 lg:col-start-9">
            Not product alone. The beginning of a street. A neighbourhood. A
            life with roots.
          </p>
        </div>

        <div className="mt-28 border-t border-white/10 lg:mt-40">
          {pillars.map((pillar) => (
            <article
              key={pillar.number}
              className="grid grid-cols-12 gap-y-7 border-b border-white/10 py-10 sm:py-12 lg:gap-x-8 lg:py-14"
            >
              <span className="col-span-2 text-[10px] tracking-[0.2em] text-white/28 lg:col-span-1">
                {pillar.number}
              </span>
              <div className="col-span-10 lg:col-span-4 lg:col-start-3">
                <p className="eyebrow">{pillar.kicker}</p>
                <h3 className="mt-5 max-w-lg text-[clamp(2rem,3.8vw,4.25rem)] font-medium leading-[0.92] tracking-[-0.055em] text-white/88">
                  {pillar.title}
                </h3>
              </div>
              <p className="col-span-10 col-start-3 max-w-xl text-base leading-7 text-white/62 lg:col-span-4 lg:col-start-8 lg:self-end lg:text-lg lg:leading-8">
                {pillar.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-28 grid grid-cols-12 gap-y-12 lg:mt-44 lg:gap-x-8">
          <div className="relative col-span-12 aspect-[2/1] overflow-hidden bg-white/[0.035] lg:col-span-7">
            <Image
              src="/Founder.webp"
              alt="Edgar Davis, Founder and CEO of House Delivery Inc."
              fill
              quality={100}
              unoptimized={true}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover brightness-90"
            />
          </div>

          <div className="col-span-11 col-start-2 self-end border-t border-white/10 pt-7 sm:col-span-8 sm:col-start-5 lg:col-span-4 lg:col-start-9">
            <p className="eyebrow">A note from our founder</p>
            <div className="mt-8">
              <p className="text-[clamp(2rem,3.4vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.055em] text-white/84">
                Too many good projects stall inside systems built for delay.
                <span className="mt-5 block text-white/38">
                  We built another path: fast. attainable. made to last.
                </span>
              </p>
              <footer className="mt-8 flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-white/45">
                <span aria-hidden="true" className="h-px w-8 bg-white/25" />
                Edgar Davis · Founder &amp; CEO
              </footer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
