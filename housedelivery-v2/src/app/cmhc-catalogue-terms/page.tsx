import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { cmhcOfficialTermsPdfHref } from "@/data/cmhc-catalogue";

const title = "CMHC Housing Design Catalogue — Terms and Conditions";
const description =
  "Understand the use of CMHC catalogue reference designs, site-specific professional review and municipal approvals, and read CMHC’s official User Terms and Conditions.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cmhc-catalogue-terms" },
  openGraph: { title, description, type: "website" },
};

const sections = [
  {
    title: "About the Catalogue",
    copy: "House Delivery features selected residential designs from Canada Mortgage and Housing Corporation’s Housing Design Catalogue, currently focusing on British Columbia.",
  },
  {
    title: "Use of Catalogue Designs",
    copy: "The catalogue provides standardized housing designs intended to support housing planning and development. The drawings are reference designs and starting points for construction planning. They must be reviewed and, where required, adapted by qualified Canadian design professionals for the specific project. They are not automatically approved construction documents or certified House Delivery manufacturing drawings.",
  },
  {
    title: "Site-Specific Requirements",
    copy: "Building projects must comply with applicable building codes, municipal bylaws, zoning regulations, engineering requirements, permitting procedures and site conditions. The catalogue drawings cannot be used as-is for site plan approval, building permits or construction. Qualified professionals must complete and approve the site-specific design and obtain applicable municipal approvals before construction proceeds.",
  },
  {
    title: "Pre-Reviewed Designs",
    copy: "Pre-reviewed catalogue designs can simplify aspects of the design and planning process. Pre-review does not constitute automatic development or building permit approval. The extent of municipal pre-review depends on the participating municipality and design. Site-specific professional review, adaptation where required and applicable municipal approvals remain necessary.",
  },
  {
    title: "Independent Company Notice",
    copy: "House Delivery Inc. is an independent Canadian housing company. Inclusion of CMHC catalogue designs does not imply CMHC endorsement, sponsorship or certification of House Delivery’s products or services.",
  },
] as const;

export default function CmhcCatalogueTermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] text-white">
        <section className="border-b border-white/10 px-5 pb-16 pt-32 sm:px-8 sm:pb-24 sm:pt-44 lg:px-12">
          <div className="mx-auto max-w-[1504px]">
            <Link
              href="/#pre-approved-homes"
              className="inline-flex min-h-11 items-center gap-3 text-xs text-white/65 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Pre-reviewed catalogue
            </Link>
            <p className="eyebrow mt-8">House Delivery / Catalogue information</p>
            <h1 className="mt-7 max-w-6xl text-[clamp(2.6rem,6.4vw,6.8rem)] font-medium leading-[0.98] tracking-[-0.06em]">
              CMHC Housing Design Catalogue —{" "}
              <span className="text-white/60">Terms and Conditions</span>
            </h1>
            <p className="mt-9 max-w-3xl text-base leading-8 text-white/65 sm:text-lg">
              An accessible explanation of the catalogue designs featured by
              House Delivery and the requirements for using them on your project.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="official-cmhc-terms"
          className="bg-[#e7e3d8] px-5 py-16 text-[#0b0c10] sm:px-8 sm:py-20 lg:px-12"
        >
          <div className="mx-auto grid max-w-[1504px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/55">
                CMHC’s official document
              </p>
              <h2
                id="official-cmhc-terms"
                className="mt-6 max-w-xl text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl"
              >
                Official CMHC Terms and Conditions
              </h2>
            </div>
            <div className="max-w-3xl space-y-6 text-base leading-8 text-black/75">
              <p>
                Customers accessing or using CMHC catalogue drawings must refer
                to the official CMHC Housing Design Catalogue User Terms and
                Conditions. This House Delivery page explains the catalogue in
                accessible language and does not replace CMHC’s official
                document. CMHC’s official Terms and Conditions govern use of the
                catalogue.
              </p>
              <a
                href={cmhcOfficialTermsPdfHref}
                className="group flex min-h-16 items-center justify-between gap-5 border border-[#0b0c10] bg-[#0b0c10] px-6 py-5 text-sm font-medium leading-6 text-white transition-colors hover:bg-transparent hover:text-[#0b0c10] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b0c10]"
              >
                Read the Official CMHC Terms and Conditions (PDF)
                <ArrowUpRight size={18} className="shrink-0" aria-hidden="true" />
              </a>
              <p className="text-sm leading-7 text-black/65">
                The PDF is hosted by CMHC. Review the official document when
                accessing or using the drawings, as CMHC may update its terms.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Catalogue use and project requirements" className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="mx-auto max-w-[1504px]">
            {sections.map((section, index) => (
              <div
                key={section.title}
                className="grid gap-6 border-t border-white/15 py-10 sm:py-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"
              >
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] text-white/45">
                    {String(index + 1).padStart(2, "0")} / 05
                  </p>
                  <h2 className="mt-5 text-2xl font-medium tracking-[-0.035em] sm:text-3xl">
                    {section.title}
                  </h2>
                </div>
                <p className="max-w-3xl text-base leading-8 text-white/65">
                  {section.copy}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
