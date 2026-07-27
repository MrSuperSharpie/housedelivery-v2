import type { Metadata } from "next";

import { HomepageComparisonReview } from "@/components/homepage-comparison-review";

export const metadata: Metadata = {
  title: "Homepage Positioning Review",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignComparisonPage() {
  return (
    <main className="min-h-screen bg-[#0b0c10] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-[1504px]">
        <div className="grid grid-cols-12 gap-y-10 border-t border-white/12 pt-7 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">
            Internal design review
          </p>
          <div className="col-span-12 lg:col-span-8 lg:col-start-5">
            <h1 className="text-[clamp(3rem,7vw,7rem)] font-medium leading-[0.88] tracking-[-0.07em]">
              Homepage
              <br />
              <span className="text-white/42">Positioning Review</span>
            </h1>
            <p className="mt-8 max-w-xl border-l border-white/15 pl-5 text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Internal review route — not part of public navigation.
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-4 border-y border-white/12 py-6 text-sm leading-6 text-white/55 sm:grid-cols-[160px_1fr] sm:gap-8">
          <p className="eyebrow pt-1">Current status</p>
          <p className="max-w-3xl">
            The proposed version is currently a protected duplicate of the
            approved homepage. Positioning and section-order revisions will be
            applied in the next review stage.
          </p>
        </div>

        <HomepageComparisonReview />
      </div>
    </main>
  );
}
