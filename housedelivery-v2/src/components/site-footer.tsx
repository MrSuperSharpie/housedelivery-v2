import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-[#0b0c10] px-5 pb-10 pt-20 text-white sm:px-8 lg:px-12 lg:pt-28">
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-12 border-b border-white/15 pb-16 md:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
          <div>
            <p className="text-4xl font-medium tracking-[-0.06em] sm:text-6xl">
              House Delivery Inc.
            </p>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/43">
              Pre-engineered component homes, coordinated from first
              feasibility through site assembly.
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
              Explore
            </p>
            <div className="mt-5 space-y-3 text-sm text-white/62">
              <Link className="block hover:text-white" href="/#models">
                Home models
              </Link>
              <Link className="block hover:text-white" href="/#timeline">
                Delivery process
              </Link>
              <Link
                className="block hover:text-white"
                href="/first-nations-inspired"
              >
                First Nations designs
              </Link>
              <Link className="block hover:text-white" href="/#certainty">
                Project certainty
              </Link>
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
              Connect
            </p>
            <div className="mt-5 space-y-3 text-sm text-white/62">
              <a
                className="block hover:text-white"
                href="mailto:hello@housedelivery.ca"
              >
                Email
              </a>
              <Link className="block hover:text-white" href="/#reserve">
                Begin your project review
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-7 text-[9px] uppercase tracking-[0.16em] text-white/28 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 House Delivery Inc. All rights reserved.</p>
          <p>Homes delivered, not just built.</p>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8">
          <p className="max-w-5xl text-sm leading-6 text-neutral-400">
            A proudly Qalipu First Nation-owned business, operating with
            respect on the traditional and unceded territories of the Musqueam,
            Squamish, and Tsleil-Waututh Nations.
          </p>
        </div>
      </div>
    </footer>
  );
}
