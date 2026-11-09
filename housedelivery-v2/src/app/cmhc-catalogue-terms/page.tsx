import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { cmhcOfficialTermsPdfHref } from "@/data/cmhc-catalogue";

const title = "CMHC Housing Design Catalogue — Terms and Conditions";
const description =
  "CMHC catalogue reference designs, site-specific professional review and municipal requirements, with access to CMHC’s official User Terms and Conditions.";

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
    copy: "The catalogue provides standardized housing designs intended to support housing planning and development. The drawings serve as reference designs and starting points for construction planning. They must be reviewed and, where required, adapted by qualified Canadian design professionals. They are not automatically approved construction documents or certified House Delivery manufacturing drawings.",
  },
  {
    title: "Site-Specific Requirements",
    copy: "Building projects must comply with applicable building codes, municipal bylaws, zoning regulations, engineering requirements, permitting procedures and site conditions. The catalogue drawings cannot be used as-is for site plan approval, building permits or construction. Qualified professionals must complete and approve the site-specific design, and applicable municipal approvals remain necessary.",
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
      <main className="bg-[#e7e3d8] text-[#0b0c10]">
        <section className="px-5 pb-24 pt-36 sm:px-8 lg:px-12 lg:pb-36 lg:pt-48">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-10 border-t border-black/18 pt-7 lg:grid-cols-12 lg:gap-x-8">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/42 lg:col-span-3">
                House Delivery / Catalogue information
              </p>
              <div className="lg:col-span-8 lg:col-start-4">
                <h1 className="max-w-4xl text-[clamp(2.6rem,5.7vw,6rem)] font-medium leading-[0.96] tracking-[-0.06em]">
                  {title}
                </h1>
                <p className="mt-9 max-w-3xl text-base leading-8 text-black/62">
                  An accessible explanation of the catalogue designs featured by
                  House Delivery and the requirements for using them.
                </p>
              </div>
            </div>

            <div className="mt-16 lg:ml-[25%] lg:mt-24 lg:w-3/4">
              <section aria-labelledby="official-cmhc-terms" className="border-t border-black/18 py-9 md:py-11">
                <h2 id="official-cmhc-terms" className="text-2xl font-medium tracking-[-0.04em]">
                  Official CMHC Terms and Conditions
                </h2>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-black/62">
                  Customers accessing or using CMHC catalogue drawings must refer
                  to the official CMHC Housing Design Catalogue User Terms and
                  Conditions. This House Delivery page is an accessible
                  explanation and does not replace CMHC’s official document.
                  CMHC’s official Terms and Conditions govern use of the catalogue.
                </p>
                <a
                  href={cmhcOfficialTermsPdfHref}
                  className="mt-7 inline-flex min-h-14 items-center bg-[#0b0c10] px-6 py-4 text-sm font-medium leading-6 text-white transition-colors hover:bg-[#24252a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b0c10]"
                >
                  Read the Official CMHC Terms and Conditions (PDF)
                </a>
              </section>
              {sections.map((section) => (
                <section key={section.title} className="grid gap-5 border-t border-black/18 py-9 md:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] md:gap-10 md:py-11">
                  <h2 className="text-2xl font-medium tracking-[-0.04em]">{section.title}</h2>
                  <p className="max-w-3xl text-sm leading-7 text-black/62">{section.copy}</p>
                </section>
              ))}
              <Link href="/#pre-approved-homes" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b0c10]">
                Return to the pre-reviewed catalogue
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
