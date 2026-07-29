import { CircleDollarSign, Layers3, ShieldCheck } from "lucide-react";
import Image from "next/image";

import { HeadlineReveal } from "@/components/headline-reveal";
import { TrustBanner } from "@/components/trust-banner";

const benefits = [
  {
    number: "01",
    title: "Cost clarity",
    description:
      "A defined component package and coordinated procurement path give owners a clearer view of where the project budget is going.",
    icon: CircleDollarSign,
  },
  {
    number: "02",
    title: "Coordinated delivery",
    description:
      "Design, documentation, procurement, production, logistics, and local construction planning advance as one connected process.",
    icon: Layers3,
  },
  {
    number: "03",
    title: "Documented quality",
    description:
      "Numbered components, coordinated specifications, and traceable selections create quality that can be reviewed, understood, and maintained.",
    icon: ShieldCheck,
  },
] as const;

type WhyHouseDeliverySectionProps = {
  image: string;
};

export function WhyHouseDeliverySection({
  image,
}: WhyHouseDeliverySectionProps) {
  return (
    <section
      id="certainty"
      aria-labelledby="why-house-delivery-heading"
      className="scroll-mt-20 bg-[#0b0c10] px-5 py-28 sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">
            Why House Delivery Inc.
          </p>
          <HeadlineReveal
            className="col-span-12 lg:col-span-9 lg:col-start-4"
          >
            <h2
              id="why-house-delivery-heading"
              className="max-w-[1250px] text-[clamp(3.5rem,8vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90"
            >
              A remarkable home.
              <br />
              <span className="text-white/38">
                A more reachable price.
              </span>
            </h2>
          </HeadlineReveal>
          <p className="col-span-10 col-start-3 max-w-xl border-l border-white/10 pl-6 text-lg leading-8 text-white/70 sm:col-span-7 sm:col-start-6 lg:col-span-4 lg:col-start-9">
            Less waste. Fewer disconnected decisions. More of the project
            investment directed toward the home itself.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-12 gap-y-12 lg:mt-20 lg:gap-x-8">
          <div className="group relative col-span-12 min-h-[500px] overflow-hidden bg-[#13151a] lg:col-span-7 lg:min-h-[680px]">
            <Image
              src={image}
              alt="Refined interior of a House Delivery Inc. residence"
              fill
              quality={100}
              unoptimized={true}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover render-crisp transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <p className="max-w-lg text-2xl font-medium leading-tight tracking-[-0.035em] sm:text-4xl">
                Built with precision.
                <br />
                Priced with purpose.
              </p>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:self-end">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.number}
                  className="grid grid-cols-[48px_1fr] gap-4 border-t border-white/10 py-8 sm:grid-cols-[60px_1fr_auto] sm:items-start sm:gap-6"
                >
                  <span className="pt-1 text-[9px] tracking-[0.2em] text-white/30">
                    {benefit.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-medium tracking-[-0.035em]">
                      {benefit.title}
                    </h3>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">
                      {benefit.description}
                    </p>
                  </div>
                  <Icon
                    size={20}
                    strokeWidth={1.4}
                    className="hidden text-white/35 sm:block"
                    aria-hidden="true"
                  />
                </article>
              );
            })}
          </div>
        </div>

        <TrustBanner compact />
      </div>
    </section>
  );
}
