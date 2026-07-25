"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { cn } from "@/lib/cn";

const fundingTracks = {
  community: [
    {
      title: "Build Canada Homes (BCH)",
      funder: "Build Canada Homes",
      supportType: "Capital / Low-Cost Financing",
      status: "ACTIVE",
      fitNote:
        "Top federal corridor for Indigenous, affordable, community, modular, prefab, public-land, and factory-built housing.",
    },
    {
      title: "ISC – First Nations On-Reserve Housing Program",
      funder: "Indigenous Services Canada (ISC)",
      supportType: "Capital Grant / Housing Support",
      status: "ONGOING",
      fitNote:
        "Foundational on-reserve housing corridor. No fixed application deadline; proposals can be submitted throughout the year.",
    },
    {
      title: "CMHC – Section 95 On-Reserve Non-Profit Housing",
      funder: "CMHC",
      supportType: "Operating Subsidy / Loan Support",
      status: "ONGOING",
      fitNote:
        "Important on-reserve non-profit rental corridor where long-term operating viability matters.",
    },
    {
      title: "Urban, Rural and Northern Indigenous Housing Strategy",
      funder: "Government of Canada",
      supportType: "Capital Funding",
      status: "DELIVERY PLANNING",
      fitNote: "Major $4B off-reserve Indigenous housing strategy.",
    },
    {
      title: "CMHC – Direct Lending for First Nation Communities",
      funder: "CMHC",
      supportType: "Low-Cost Debt",
      status: "ONGOING",
      fitNote:
        "Practical repayable-financing corridor for First Nations advancing on-reserve housing.",
    },
    {
      title: "ISC – Ministerial Loan Guarantees (MLG)",
      funder: "ISC",
      supportType: "Loan Guarantee",
      status: "ONGOING",
      fitNote: "Essential enabling tool for on-reserve borrowing.",
    },
    {
      title: "CMHC – Insured Loans for On-Reserve Housing",
      funder: "CMHC",
      supportType: "Mortgage Insurance / Credit Support",
      status: "ONGOING",
      fitNote:
        "Useful where insured financing support is needed for on-reserve housing.",
    },
    {
      title: "BC Housing – Community Housing Fund (CHF)",
      funder: "BC Housing",
      supportType: "Capital Grant / Operating Subsidy",
      status: "MONITOR",
      fitNote: "Strong B.C. community housing corridor.",
    },
    {
      title: "BC Housing – Indigenous Housing Fund (IHF)",
      funder: "BC Housing",
      supportType: "Capital Grant / Operating Support",
      status: "MONITOR",
      fitNote:
        "Highly relevant B.C. Indigenous housing corridor for on- and off-reserve affordable rental homes.",
    },
    {
      title: "CBT – First Nations Housing Sustainability Initiative",
      funder: "Columbia Basin Trust",
      supportType: "Capital Grant",
      status: "VERIFY INTAKE",
      fitNote: "Regional Columbia Basin corridor.",
    },
    {
      title: "BC Hydro – PIEER",
      funder: "BC Hydro",
      supportType: "Energy / Resilience Add-On",
      status: "ONGOING",
      fitNote:
        "Relevant for Indigenous energy-efficiency planning, assessments, and retrofit work.",
    },
  ],
  developer: [
    {
      title: "CMHC – Apartment Construction Loan Program (ACLP)",
      funder: "CMHC",
      supportType: "Low-Cost Construction Debt",
      status: "OPEN",
      fitNote:
        "Core low-cost construction financing for eligible rental apartment projects across Canada.",
    },
    {
      title: "CMHC – MLI Select",
      funder: "CMHC",
      supportType: "Mortgage Insurance / Financing Support",
      status: "ACTIVE",
      fitNote:
        "Preferred CMHC multi-unit insurance path for projects committing to affordability, accessibility, and climate performance.",
    },
    {
      title: "Build Canada Homes (BCH)",
      funder: "Build Canada Homes",
      supportType: "Capital / Low-Cost Financing",
      status: "ACTIVE",
      fitNote:
        "Priority federal corridor for affordable, community, Indigenous, middle-income, public-land, and factory-built housing.",
    },
    {
      title: "CMHC – Modular Rental Housing Construction Insurance",
      funder: "CMHC",
      supportType: "Mortgage Insurance / Modular Financing Support",
      status: "VERIFY",
      fitNote:
        "Highly relevant for modular multi-unit rental projects meeting strict CSA and bonding conditions.",
    },
    {
      title: "BC Builds",
      funder: "BC Housing",
      supportType: "Low-Interest Financing / Land Partnerships",
      status: "OPEN",
      fitNote:
        "B.C.-specific middle-income rental corridor. Strong fit when land, municipal approvals, and delivery timing are aligned.",
    },
    {
      title: "Purpose-Built Rental Housing Rebate",
      funder: "CRA / Government of Canada",
      supportType: "GST/HST Tax Incentive",
      status: "ACTIVE",
      fitNote:
        "Important pro-forma benefit for qualifying new purpose-built rental housing.",
    },
    {
      title: "Federal Lands Initiative",
      funder: "CMHC",
      supportType: "Land Transfer / Lease at Discount",
      status: "ROLLING",
      fitNote:
        "Supports affordable housing through discounted or no-cost land transfer/lease.",
    },
  ],
  buyer: [
    {
      title: "First Home Savings Account (FHSA)",
      funder: "CRA / Financial Institutions",
      supportType: "Savings Tool",
      status: "ACTIVE",
      fitNote:
        "Tax-advantaged savings tool for eligible first-time buyers.",
    },
    {
      title: "Home Buyers’ Plan (HBP)",
      funder: "CRA",
      supportType: "Savings Tool",
      status: "ACTIVE",
      fitNote:
        "Allows eligible buyers to withdraw RRSP funds tax-free to buy or build a qualifying home.",
    },
    {
      title: "First-Time Home Buyers’ GST/HST Rebate",
      funder: "CRA / Government of Canada",
      supportType: "Tax Relief / Rebate",
      status: "VERIFY",
      fitNote:
        "Potential GST/HST relief for eligible first-time buyers of newly built homes.",
    },
    {
      title: "B.C. First Time Home Buyers’ Program",
      funder: "Province of B.C.",
      supportType: "Property Transfer Tax Relief",
      status: "ACTIVE",
      fitNote:
        "Property Transfer Tax relief for eligible first-time buyers in B.C.",
    },
    {
      title: "B.C. Newly Built Home Exemption",
      funder: "Province of B.C.",
      supportType: "Property Transfer Tax Relief",
      status: "ACTIVE",
      fitNote:
        "Property Transfer Tax exemption for eligible newly built principal residences in B.C.",
    },
    {
      title: "CMHC Mortgage Loan Insurance",
      funder: "CMHC",
      supportType: "Mortgage Support",
      status: "ACTIVE",
      fitNote:
        "Supports qualified buyers with insured mortgage financing and lower down-payment pathways.",
    },
    {
      title: "CMHC Eco Plus",
      funder: "CMHC",
      supportType: "Mortgage Insurance Premium Refund",
      status: "ACTIVE",
      fitNote:
        "Buyers may qualify for a partial CMHC mortgage loan insurance premium refund for energy-efficient homes.",
    },
  ],
} as const;

type FundingTrack = keyof typeof fundingTracks;

const trackIndex: ReadonlyArray<{
  key: FundingTrack;
  number: string;
  label: string;
  audience: string;
}> = [
  {
    key: "community",
    number: "01",
    label: "Community",
    audience: "First Nations",
  },
  {
    key: "developer",
    number: "02",
    label: "Developer",
    audience: "Project capital",
  },
  {
    key: "buyer",
    number: "03",
    label: "Buyer",
    audience: "Home ownership",
  },
];

export function FinancialCorridors() {
  const [activeTrack, setActiveTrack] =
    useState<FundingTrack>("community");
  const activeEntries = fundingTracks[activeTrack];
  const activeIndex = trackIndex.find((track) => track.key === activeTrack);

  return (
    <section
      id="financial-corridors"
      className="scroll-mt-20 bg-[#0B0C10] px-5 py-32 sm:px-8 lg:px-12 lg:py-44"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">
            Funding / Financial corridors
          </p>

          <h2 className="col-span-12 max-w-[1250px] text-[clamp(3.5rem,8vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90 lg:col-span-9 lg:col-start-4">
            Capital aligned.
            <br />
            <span className="text-white/38">Communities built.</span>
          </h2>

          <p className="col-span-11 max-w-2xl text-lg leading-8 text-white/70 sm:col-span-8 sm:col-start-4 lg:col-span-5 lg:col-start-8">
            Navigating the capital stack shouldn&apos;t stall your project. We
            actively guide First Nations, developers, and homebuyers through
            federal, provincial, and private financial corridors to unlock
            housing delivery.
          </p>
        </div>

        <div className="mt-28 grid grid-cols-12 gap-y-16 lg:mt-40 lg:gap-x-8">
          <div className="col-span-12 lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <p className="mb-5 text-[9px] uppercase tracking-[0.22em] text-white/30">
                Select a capital track
              </p>

              <div
                className="grid grid-cols-3 border-b border-white/10 lg:block lg:border-b-0"
                aria-label="Funding audiences"
              >
                {trackIndex.map((track) => {
                  const isActive = activeTrack === track.key;

                  return (
                    <button
                      key={track.key}
                      type="button"
                      onClick={() => setActiveTrack(track.key)}
                      aria-pressed={isActive}
                      className={cn(
                        "group relative min-w-0 border-t px-2 py-5 text-left transition-colors duration-500 first:pl-0 last:pr-0 lg:block lg:w-full lg:px-0 lg:py-7",
                        isActive
                          ? "border-white text-white"
                          : "border-white/10 text-white/38 hover:border-white/30 hover:text-white/70",
                      )}
                    >
                      <span className="block text-[9px] tabular-nums tracking-[0.2em] opacity-55">
                        {track.number}
                      </span>
                      <span className="mt-4 block text-[clamp(1.05rem,1.8vw,1.6rem)] font-medium tracking-[-0.04em]">
                        {track.label}
                      </span>
                      <span
                        className={cn(
                          "mt-1 hidden text-[9px] uppercase tracking-[0.18em] transition-colors sm:block",
                          isActive ? "text-white/50" : "text-white/25",
                        )}
                      >
                        {track.audience}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 lg:col-start-5">
            <div className="flex items-end justify-between gap-6 border-b border-white/10 pb-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.22em] text-white/30">
                  Active ledger
                </p>
                <p className="mt-2 text-sm text-white/65">
                  {activeIndex?.audience}
                </p>
              </div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                {String(activeEntries.length).padStart(2, "0")} corridors
              </p>
            </div>

            <div className="hidden grid-cols-12 gap-x-6 py-4 lg:grid">
              <span className="col-span-1 text-[9px] uppercase tracking-[0.2em] text-white/25">
                Ref.
              </span>
              <span className="col-span-5 text-[9px] uppercase tracking-[0.2em] text-white/25">
                Corridor
              </span>
              <span className="col-span-2 text-[9px] uppercase tracking-[0.2em] text-white/25">
                Funder
              </span>
              <span className="col-span-2 text-[9px] uppercase tracking-[0.2em] text-white/25">
                Support
              </span>
              <span className="col-span-2 text-right text-[9px] uppercase tracking-[0.2em] text-white/25">
                Status
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTrack}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
              >
                {activeEntries.map((entry, index) => (
                  <article
                    key={entry.title}
                    className="grid grid-cols-12 gap-x-4 gap-y-8 border-t border-white/10 py-9 lg:gap-x-6 lg:py-11"
                  >
                    <span className="col-span-2 pt-1 text-[9px] tabular-nums tracking-[0.2em] text-white/30 lg:col-span-1">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="col-span-10 lg:col-span-5">
                      <h3 className="max-w-xl text-xl font-medium leading-tight tracking-[-0.04em] text-white/90 sm:text-2xl">
                        {entry.title}
                      </h3>
                      <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                        {entry.fitNote}
                      </p>
                    </div>

                    <dl className="col-span-10 col-start-3 grid grid-cols-2 gap-x-5 gap-y-6 lg:col-span-6 lg:col-start-auto lg:contents">
                      <div className="lg:col-span-2">
                        <dt className="text-[9px] uppercase tracking-[0.2em] text-white/30 lg:sr-only">
                          Funder
                        </dt>
                        <dd className="mt-2 text-[10px] uppercase leading-5 tracking-widest text-white/50 lg:mt-0">
                          {entry.funder}
                        </dd>
                      </div>

                      <div className="lg:col-span-2">
                        <dt className="text-[9px] uppercase tracking-[0.2em] text-white/30 lg:sr-only">
                          Support
                        </dt>
                        <dd className="mt-2 text-[10px] uppercase leading-5 tracking-widest text-white/50 lg:mt-0">
                          {entry.supportType}
                        </dd>
                      </div>

                      <div className="col-span-2 lg:col-span-2 lg:text-right">
                        <dt className="text-[9px] uppercase tracking-[0.2em] text-white/30 lg:sr-only">
                          Status
                        </dt>
                        <dd className="mt-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50 lg:mt-0">
                          <span
                            aria-hidden="true"
                            className="size-1 rounded-full bg-white/70"
                          />
                          {entry.status}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </motion.div>
            </AnimatePresence>

            <p className="border-t border-white/10 pt-5 text-xs leading-5 text-white/30">
              Every corridor moves on its own terms. Eligibility, intake, and
              approval remain with the issuing organization.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
