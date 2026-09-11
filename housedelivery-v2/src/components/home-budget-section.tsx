import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import { modelBudgetCopy } from "@/data/pricing";
import { getBudgetInquiryHref } from "@/lib/budget-inquiry";

export function HomeBudgetSection({ model }: { model: string }) {
  return (
    <section aria-labelledby="home-budget-heading" className="mt-16 border-t border-white/15 pt-10">
      <p className="eyebrow">Site-specific planning</p>
      <HeadlineReveal className="mt-5">
        <h2 id="home-budget-heading" className="text-4xl font-medium tracking-[-0.055em] sm:text-5xl">
          Plan your budget
        </h2>
      </HeadlineReveal>
      <p className="mt-6 max-w-2xl text-base leading-7 text-white/65">{modelBudgetCopy}</p>
      <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
        <Link href={getBudgetInquiryHref({ model })} className="inline-flex min-h-12 items-center border border-white bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white">
          Get a site-specific budget
        </Link>
        <Link href="/pricing" className="inline-flex min-h-11 items-center border-b border-white/30 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white">
          View pricing guide
        </Link>
      </div>
    </section>
  );
}
