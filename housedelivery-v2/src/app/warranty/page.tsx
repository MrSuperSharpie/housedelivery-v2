import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Warranty & After-Sales Support",
  description:
    "Learn how House Delivery coordinates project-specific product warranties, manufacturer documentation and after-sales support.",
  openGraph: {
    title: "Warranty & After-Sales Support | House Delivery",
    description:
      "A clear, coordinated pathway for project-specific product warranties and after-sales support.",
    type: "website",
  },
};

const supportSteps = [
  {
    number: "01",
    title: "Tell us what happened",
    description:
      "The customer provides the project address, product or component involved, photographs and a brief description of the issue.",
  },
  {
    number: "02",
    title: "We identify the responsible coverage",
    description:
      "House Delivery reviews the project records to determine the product, supplier, warranty documentation and whether the issue relates to the supplied product, installation or local construction work.",
  },
  {
    number: "03",
    title: "We coordinate the next step",
    description:
      "Where a manufacturer warranty applies, House Delivery helps coordinate documentation, replacement components, parts or other available manufacturer support.",
  },
] as const;

const coverageExamples = [
  "Structural framing systems",
  "Windows and exterior doors",
  "Exterior cladding",
  "Flooring",
  "Cabinetry and millwork",
  "Interior doors",
  "Door hardware",
  "Plumbing fixtures",
  "Selected appliances and equipment",
  "Other House Delivery-supplied components",
] as const;

const warrantyScheduleItems = [
  "Manufacturer",
  "Product or system",
  "Warranty period",
  "Coverage",
  "Exclusions",
  "Maintenance requirements",
  "Claim procedure",
  "Replacement-parts information",
  "Supplier contact and support records",
] as const;

const supplierCoverageNotes = [
  {
    label: "Documented product warranties",
    copy: "Several House Delivery manufacturing partners already provide documented product warranties, including extended coverage on selected windows, doors, exterior cladding and other building components.",
  },
  {
    label: "Confirmed for your project",
    copy: "Exact coverage is confirmed against the products selected for each project.",
  },
] as const;

export default function WarrantyPage() {
  return (
    <>
      <SiteHeader />
      <main className="overflow-hidden bg-[#0b0c10] text-white">
        <section className="border-b border-white/10 px-5 pb-20 pt-36 sm:px-8 sm:pb-28 sm:pt-44 lg:px-12 lg:pb-36 lg:pt-52">
          <div className="mx-auto max-w-[1504px]">
            <p className="eyebrow">House Delivery / Warranty + support</p>
            <HeadlineReveal trigger="mount" className="mt-8">
              <h1 className="max-w-[1400px] text-[clamp(3.5rem,9vw,9.4rem)] font-medium leading-[0.84] tracking-[-0.075em]">
                Warranty &amp;
                <br />
                <span className="text-white/38">After-Sales Support.</span>
              </h1>
            </HeadlineReveal>

            <div className="mt-14 grid gap-8 border-t border-white/16 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/52">
                Confidence after delivery.
              </p>
              <div className="max-w-3xl">
                <p className="text-xl leading-8 tracking-[-0.025em] text-white/76 sm:text-2xl sm:leading-9">
                  House Delivery coordinates homes using products and systems
                  from qualified manufacturing partners. Warranty coverage is
                  tied to the actual products, components and construction
                  scope selected for each project.
                </p>
                <p className="mt-5 text-sm leading-7 text-white/50 sm:text-base sm:leading-8">
                  Before an order is finalized, the applicable warranty
                  information is documented as part of the project package.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#e7e3d8] px-5 py-24 text-[#0b0c10] sm:px-8 lg:px-12 lg:py-36">
          <ScrollReveal>
            <div className="mx-auto grid max-w-[1504px] gap-12 lg:grid-cols-12 lg:gap-x-8">
              <div className="lg:col-span-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/48">
                  One point of contact
                </p>
                <h2 className="mt-7 max-w-4xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]">
                  You should not have to chase multiple factories.
                </h2>
              </div>
              <div className="max-w-2xl border-t border-black/16 pt-7 lg:col-span-5 lg:col-start-8 lg:self-end">
                <p className="text-base leading-8 text-black/68">
                  If an issue arises with a product supplied through House
                  Delivery, our team helps identify the component, locate the
                  applicable warranty documentation and coordinate the next
                  step with the responsible manufacturer or supplier.
                </p>
                <p className="mt-5 text-base leading-8 text-black/68">
                  House Delivery acts as the coordination point between the
                  customer, supplier and project team.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section
          aria-labelledby="support-process-heading"
          className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
        >
          <div className="mx-auto max-w-[1504px]">
            <p className="eyebrow">How warranty support works</p>
            <h2
              id="support-process-heading"
              className="mt-7 max-w-5xl text-[clamp(3rem,6vw,6.5rem)] font-medium leading-[0.88] tracking-[-0.065em]"
            >
              A clear path from question to next step.
            </h2>

            <div className="mt-14 grid border-l border-t border-white/14 md:grid-cols-3 lg:mt-20">
              {supportSteps.map((step) => (
                <article
                  key={step.number}
                  className="flex min-h-96 flex-col border-b border-r border-white/14 bg-[#0e1014] p-7 sm:p-9"
                >
                  <span className="font-mono text-[10px] tracking-[0.2em] text-white/34">
                    {step.number} / 03
                  </span>
                  <h3 className="mt-auto pt-16 text-3xl font-medium leading-[0.96] tracking-[-0.05em] text-white/90">
                    {step.title}
                  </h3>
                  <p className="mt-6 text-sm leading-7 text-white/50">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="coverage-heading"
          className="bg-[#ded9cd] px-5 py-24 text-[#0b0c10] sm:px-8 lg:px-12 lg:py-36"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-8">
              <div className="lg:col-span-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/48">
                  What may be covered
                </p>
                <h2
                  id="coverage-heading"
                  className="mt-7 text-[clamp(3rem,6vw,6.4rem)] font-medium leading-[0.88] tracking-[-0.065em]"
                >
                  Coverage follows the selected components.
                </h2>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <div className="grid border-l border-t border-black/14 sm:grid-cols-2">
                  {coverageExamples.map((item, index) => (
                    <div
                      key={item}
                      className="flex min-h-24 items-start gap-4 border-b border-r border-black/14 p-5"
                    >
                      <span className="font-mono text-[9px] tracking-[0.15em] text-black/34">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm leading-6 text-black/72">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-12 max-w-5xl border-t border-black/18 pt-7 text-sm leading-7 text-black/62">
              Coverage, duration, exclusions and claim procedures vary by
              product and manufacturer. The project-specific warranty schedule
              and applicable manufacturer documents determine the actual
              coverage.
            </p>
          </div>
        </section>

        <section className="border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <ScrollReveal variant="fade">
            <div className="mx-auto grid max-w-[1504px] gap-12 lg:grid-cols-12 lg:gap-x-8">
              <div className="lg:col-span-5">
                <p className="eyebrow">Product warranty vs. local workmanship</p>
                <h2 className="mt-7 text-[clamp(3rem,6vw,6.4rem)] font-medium leading-[0.88] tracking-[-0.065em]">
                  Clear responsibility matters.
                </h2>
              </div>
              <div className="max-w-2xl border-t border-white/14 pt-7 lg:col-span-6 lg:col-start-7 lg:self-end">
                <p className="text-base leading-8 text-white/62">
                  House Delivery coordinates the supply of the products and
                  systems included in our agreed scope.
                </p>
                <p className="mt-6 text-base leading-8 text-white/62">
                  Local site work — including foundations, utilities,
                  installation, assembly, mechanical and electrical work,
                  finishing and other construction performed by local
                  contractors — remains subject to the warranties, contractual
                  responsibilities and statutory requirements applicable to
                  those contractors and the project location.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section
          aria-labelledby="warranty-schedule-heading"
          className="bg-[#e7e3d8] px-5 py-24 text-[#0b0c10] sm:px-8 lg:px-12 lg:py-36"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-8">
              <div className="lg:col-span-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/48">
                  Project-specific warranty schedule
                </p>
                <h2
                  id="warranty-schedule-heading"
                  className="mt-7 text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]"
                >
                  Your warranty package follows your home.
                </h2>
                <div className="mt-8 max-w-2xl space-y-5 text-base leading-8 text-black/64">
                  <p>
                    Because House Delivery homes can include products from
                    several qualified manufacturers, there is not one generic
                    warranty document that accurately describes every project.
                  </p>
                  <p>
                    Before final procurement, House Delivery confirms the
                    selected products and assembles the applicable warranty
                    information into the project documentation.
                  </p>
                </div>
              </div>
              <div className="lg:col-span-5 lg:col-start-8 lg:self-end">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40">
                  This may include
                </p>
                <ul className="mt-5 border-t border-black/16">
                  {warrantyScheduleItems.map((item, index) => (
                    <li
                      key={item}
                      className="flex items-center gap-5 border-b border-black/16 py-4 text-sm text-black/68"
                    >
                      <span className="font-mono text-[9px] tracking-[0.16em] text-black/34">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="supplier-coverage-heading"
          className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-8">
              <div className="lg:col-span-5">
                <p className="eyebrow">Current supplier coverage</p>
                <h2
                  id="supplier-coverage-heading"
                  className="mt-7 text-[clamp(3rem,6vw,6.4rem)] font-medium leading-[0.88] tracking-[-0.065em]"
                >
                  Documented around the products you select.
                </h2>
              </div>
              <div className="grid border-l border-t border-white/14 sm:grid-cols-2 lg:col-span-7">
                {supplierCoverageNotes.map((item) => (
                  <article
                    key={item.label}
                    className="min-h-72 border-b border-r border-white/14 bg-[#0e1014] p-7 sm:p-9"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">
                      {item.label}
                    </p>
                    <p className="mt-12 text-base leading-8 text-white/62">
                      {item.copy}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#ded9cd] px-5 py-24 text-[#0b0c10] sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/44">
              A simple customer promise
            </p>
            <blockquote className="mt-8 max-w-[1300px] text-[clamp(3rem,6.8vw,7.5rem)] font-medium leading-[0.9] tracking-[-0.068em]">
              If we supplied it, we will help you determine who is responsible
              and what the next step is.
            </blockquote>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">Warranty + product support</p>
                <h2 className="mt-7 max-w-5xl text-[clamp(3.4rem,7vw,7.8rem)] font-medium leading-[0.84] tracking-[-0.07em]">
                  Have a warranty or
                  <br />
                  <span className="text-white/38">product question?</span>
                </h2>
                <p className="mt-8 max-w-2xl text-base leading-8 text-white/55">
                  For an existing House Delivery project, contact our team with
                  your project information and we will help identify the
                  appropriate support pathway.
                </p>
              </div>
              <div className="flex min-w-72 flex-col gap-3">
                <a
                  href="mailto:hello@housedelivery.ca"
                  className="group flex min-h-14 items-center justify-between gap-10 bg-white px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0b0c10] transition-colors hover:bg-[#ded9cd]"
                >
                  Contact House Delivery
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </a>
                <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/36">
                  Planning a new project?
                </p>
                <Link
                  href="/#models"
                  className="group flex min-h-14 items-center justify-between gap-10 border border-white/28 px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-white"
                >
                  Explore our homes
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </Link>
              </div>
            </div>

            <p className="mt-20 max-w-5xl border-t border-white/12 pt-7 text-xs leading-6 text-white/36">
              Warranty coverage varies by manufacturer, product, installation
              method and project agreement. Manufacturer warranties are
              subject to their individual terms, exclusions and claim
              procedures. Local construction and installation warranties are
              governed by the responsible contractors and applicable project
              requirements.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
