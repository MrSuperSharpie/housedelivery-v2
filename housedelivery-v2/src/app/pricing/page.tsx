import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { HomeBudgetPlanner } from "@/components/home-budget-planner";

import { HeadlineReveal } from "@/components/headline-reveal";
import { PricingConstructionDetails } from "@/components/pricing-construction-details";
import { SiteHeader } from "@/components/site-header";
import { pricingGuide, productionTimingCopy } from "@/data/pricing";
import { getBudgetInquiryHref } from "@/lib/budget-inquiry";

export const metadata: Metadata = {
  title: "Pricing guide",
  description: pricingGuide.introduction,
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] px-5 pb-24 pt-36 text-white sm:px-8 lg:px-12 lg:pb-36 lg:pt-48">
        <div className="mx-auto max-w-[1504px]">
          <p className="eyebrow">Pricing guide / {pricingGuide.currency}</p>
          <HeadlineReveal className="mt-7">
            <h1 className="max-w-5xl text-[clamp(3.5rem,7vw,7.5rem)] font-medium leading-[0.92] tracking-[-0.065em]">Plan with clarity.</h1>
          </HeadlineReveal>
          <h2 className="mt-8 max-w-3xl text-lg leading-8 text-white/70">{pricingGuide.introduction}</h2>
          <div className="mt-10 max-w-4xl border-l border-white/25 pl-6">
            <p className="text-sm leading-7 text-white/65">{pricingGuide.applicability}</p>
            <p className="mt-3 text-xs leading-6 text-white/55">Reviewed <time dateTime={pricingGuide.reviewedOn}>{pricingGuide.reviewLabel}</time>.</p>
          </div>

          <section aria-labelledby="finish-budgets-heading" className="mt-16 lg:mt-24">
            <h2 id="finish-budgets-heading" className="text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Three finish levels</h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/65">
              {pricingGuide.tierScopeNote}
            </p>
            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
              {pricingGuide.levels.map((level) => (
                <article key={level.id} data-pricing-level={level.id} className="flex min-w-0 flex-col border border-white/15 bg-[#0e1014] p-7 sm:p-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Inclusions and finishes</p>
                  <h3 className="mt-5 text-4xl font-medium tracking-[-0.055em]">{level.name}</h3>
                  <p className="mt-5 min-h-21 text-sm leading-7 text-white/65">{level.description}</p>
                  <dl className="mt-8 border-t border-white/15 pt-7">
                    <dt className="text-sm font-medium text-white/80">Package selection</dt>
                    <dd className="mt-4">
                      <span className="block text-3xl font-medium leading-none tracking-[-0.055em]">{level.priceLabel}</span>
                      <span className="mt-3 block text-sm text-white/60">Model-specific scope and quote</span>
                    </dd>
                    <dt className="mt-8 border-t border-white/15 pt-6 text-xs text-white/65">{pricingGuide.scopes.delivery.label}</dt>
                    <dd className="mt-3 text-xl font-medium tracking-[-0.03em]">{pricingGuide.scopes.delivery.budgetLabel}</dd>
                  </dl>
                  <PricingConstructionDetails id={level.id} />
                </article>
              ))}
            </div>
            <p className="mt-7 border border-white/15 p-6 text-sm leading-7 text-white/70">{pricingGuide.disclosure}</p>
          </section>

          <section aria-labelledby="pricing-scopes-heading" className="mt-20 border-t border-white/15 pt-10">
            <h2 id="pricing-scopes-heading" className="text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Three project stages</h2>
            <dl className="mt-8 grid gap-8 lg:grid-cols-3">
              {Object.values(pricingGuide.scopes).map((scope) => (
                <div key={scope.label} className="border-t border-white/15 pt-6">
                  <dt className="text-lg font-medium tracking-[-0.025em]">{scope.label}</dt>
                  <dd className="mt-4 text-sm leading-7 text-white/65">{scope.description}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="pricing-selections-heading" className="mt-20 max-w-4xl border-t border-white/15 pt-10">
            <h2 id="pricing-selections-heading" className="text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Your home, your selections</h2>
            <p className="mt-6 text-base leading-7 text-white/65">
              Essential is included in each model’s base package. Premium and Signature are optional upgrades to inclusions and finishes. Your existing room selections can be retained for review, including a mix of Premium and Signature products. The final quote reconciles those selections against the included products without duplicate charges.
            </p>
            <p className="mt-5 text-sm leading-7 text-white/65">{productionTimingCopy}</p>
            <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
              <Link href={getBudgetInquiryHref()} className="inline-flex min-h-12 items-center border border-white bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white">Get a site-specific budget</Link>
              <Link href="/#homes" className="inline-flex min-h-11 items-center border-b border-white/30 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white">Explore the homes</Link>
            </div>
          </section>
          <Suspense fallback={<p className="mt-10 text-white/65">Loading home budget planner…</p>}>
            <HomeBudgetPlanner />
          </Suspense>
        </div>
      </main>
    </>
  );
}
