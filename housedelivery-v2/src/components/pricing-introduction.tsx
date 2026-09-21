import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";

export function PricingIntroduction() {
  return (
    <section aria-labelledby="pricing-introduction-heading" className="border-y border-white/10 bg-[#0e1014] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-[1504px]">
        <p className="eyebrow">Pricing / Plan with perspective</p>
        <HeadlineReveal className="mt-5">
          <h2 id="pricing-introduction-heading" className="text-4xl font-medium tracking-[-0.055em] sm:text-5xl">A clearer view of your budget.</h2>
        </HeadlineReveal>
        <p className="mt-6 max-w-3xl text-base leading-7 text-white/65">
          Choose your home and explore Premium at $225 per sq. ft. or Signature at $275 per sq. ft. These are home-package prices. On-site assembly and erection, site work, foundations, services, local trades and land are separate. Appliances are selected and priced separately.
        </p>
        <Link href="/pricing" className="mt-7 inline-flex min-h-11 items-center border-b border-white/30 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 transition-colors hover:text-white">View pricing guide</Link>
        <Link href="/pricing#budget-planner" className="ml-6 inline-flex min-h-11 items-center border-b border-white/30 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 transition-colors hover:text-white">Open home budget planner</Link>
      </div>
    </section>
  );
}
