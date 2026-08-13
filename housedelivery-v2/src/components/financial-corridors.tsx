"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  MapPinned,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";

import { HeadlineReveal } from "@/components/headline-reveal";
import { FundingValueCase } from "@/components/why-house-delivery-section";
import { cn } from "@/lib/cn";

type FundingPathway = {
  title: string;
  funder: string;
  supportType: string;
  status: string;
  fitNote: string;
};

const fundingTracks: Readonly<
  Record<
    "community" | "developer" | "buyer",
    readonly FundingPathway[]
  >
> = {
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
};

const pathways = [
  {
    id: "homeowners",
    number: "01",
    label: "Homeowners",
    heading: "A clearer route from aspiration to ownership.",
    body: "Begin with your site, budget, or preferred home. House Delivery helps define the component package, project scope, delivery requirements, and financing information needed for more productive conversations with lenders and project partners.",
  },
  {
    id: "landowners-developers",
    number: "02",
    label: "Landowners & Developers",
    heading: "Turn land into a defined opportunity.",
    body: "A coordinated design and delivery system can help landowners and developers assess what a site may support, establish a clearer preliminary scope, and prepare stronger conversations with planners, lenders, investors, and delivery partners.",
  },
  {
    id: "first-nations",
    number: "03",
    label: "First Nations",
    heading: "Build around community priorities.",
    body: "House Delivery works with First Nations to help shape housing opportunities around local land, community needs, available funding corridors, cultural direction, and long-term ownership objectives.",
  },
  {
    id: "municipal-community",
    number: "04",
    label: "Municipal & Community Housing",
    heading: "Move viable housing initiatives toward delivery.",
    body: "Community Housing remains a delivery pathway for First Nations, municipalities, non-profits, developers, and larger housing programs. Projects can begin with a site, housing need, approved design pathway, or funding opportunity; House Delivery helps organize the design, component, documentation, and delivery pieces into a clearer project record.",
  },
] as const;

type PathwayId = (typeof pathways)[number]["id"];

const pathwayImages: Readonly<
  Record<PathwayId, { src: string; alt: string }>
> = {
  homeowners: {
    src: "/Maplewood-14.avif",
    alt: "Bright Maplewood kitchen and dining interior with a glass staircase",
  },
  "landowners-developers": {
    src: "/Langley-3.avif",
    alt: "Langley dining room with sculptural lighting and an open garden terrace",
  },
  "first-nations": {
    src: "/firstnations.webp",
    alt: "Coastal kitchen featuring First Nations artwork and ocean views",
  },
  "municipal-community": {
    src: "/timberline-2.avif",
    alt: "Bright Timberline kitchen interior with a glass staircase",
  },
};

const cmhcContext = [
  {
    number: "01",
    title: "Catalogue baseline",
    copy: "A coordinated reference can reduce early-stage repetition and make the project record more legible.",
  },
  {
    number: "02",
    title: "Site adaptation",
    copy: "House Delivery organizes the project-specific design, documentation, and local delivery requirements.",
  },
  {
    number: "03",
    title: "Funding context",
    copy: "Financing and program eligibility depend on the borrower, land, project, lender, and applicable pathway.",
  },
] as const;

const municipalCommunityPathways: readonly FundingPathway[] = [
  fundingTracks.developer[2],
  fundingTracks.community[7],
  fundingTracks.developer[4],
  fundingTracks.developer[0],
  fundingTracks.developer[1],
  fundingTracks.developer[6],
  fundingTracks.developer[5],
];

const audiencePathways: Readonly<
  Record<PathwayId, readonly FundingPathway[]>
> = {
  homeowners: fundingTracks.buyer,
  "landowners-developers": fundingTracks.developer,
  "first-nations": fundingTracks.community,
  "municipal-community": municipalCommunityPathways,
};

export function FinancialCorridors() {
  const [activePathway, setActivePathway] =
    useState<PathwayId>("homeowners");
  const [isExpanded, setIsExpanded] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeImage = pathwayImages[activePathway];

  function activatePathway(pathwayId: PathwayId) {
    setActivePathway(pathwayId);
    setIsExpanded(false);
  }

  function selectTab(index: number) {
    const pathway = pathways[index];
    activatePathway(pathway.id);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % pathways.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + pathways.length) % pathways.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = pathways.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    selectTab(nextIndex);
  }

  return (
    <section
      id="cmhc"
      aria-labelledby="proposed-funding-heading"
      className="scroll-mt-20 bg-[#0b0c10] px-5 py-24 sm:px-8 sm:py-28 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px]">
        <span
          id="financial-corridors"
          className="block scroll-mt-20"
          aria-hidden="true"
        />
        <div className="grid grid-cols-12 gap-y-10 border-t border-white/12 pt-7 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">
            CMHC, funding &amp; community pathways
          </p>

          <HeadlineReveal className="col-span-12 lg:col-span-9 lg:col-start-4">
            <h2
              id="proposed-funding-heading"
              className="max-w-[1260px] text-[clamp(3rem,6.2vw,6.8rem)] font-medium leading-[0.86] tracking-[-0.068em] text-white/90"
            >
              The right funding pathway can help make the right home possible.
            </h2>
          </HeadlineReveal>

          <p className="col-span-12 max-w-2xl text-base leading-7 text-white/62 sm:col-span-9 sm:col-start-4 sm:text-lg sm:leading-8 lg:col-span-5 lg:col-start-8">
            Canada’s Housing Design Catalogue can reduce early-stage repetition
            and give project teams a stronger baseline. Every design still
            requires site-specific adaptation for land, zoning, utilities,
            foundations, engineering, permits, climate, and local construction
            requirements.
          </p>
        </div>

        <FundingValueCase image="/Maplewood-14.avif" />

        <div className="mt-14 grid border-y border-white/12 lg:mt-16 lg:grid-cols-12">
          <article className="relative flex min-h-[390px] flex-col justify-between overflow-hidden border-b border-white/12 bg-[#0e1014] p-7 sm:p-8 lg:col-span-5 lg:min-h-[460px] lg:border-r lg:border-b-0">
            <div
              className="absolute -right-16 -top-14 size-72 rounded-full border border-white/10 sm:size-96"
              aria-hidden="true"
            />
            <div className="relative flex items-start justify-between gap-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/48">
                Canada Housing Design Catalogue
              </p>
              <BadgeCheck size={23} strokeWidth={1.25} aria-hidden="true" />
            </div>
            <div className="relative">
              <p className="text-[clamp(5rem,10vw,9rem)] font-medium leading-[0.74] tracking-[-0.085em]">
                CMHC
              </p>
              <p className="mt-9 max-w-md border-t border-white/10 pt-7 text-2xl font-medium leading-[1.02] tracking-[-0.05em] sm:text-3xl">
                A consistent design reference. A locally coordinated project.
              </p>
            </div>
          </article>

          <div className="grid sm:grid-cols-3 lg:col-span-7">
            {cmhcContext.map((item, index) => (
              <article
                key={item.number}
                className={`flex min-h-0 flex-col justify-between p-6 sm:min-h-52 sm:p-7 lg:p-8 ${
                  index > 0
                    ? "border-t border-white/12 sm:border-t-0 sm:border-l"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-6">
                  <span className="text-[9px] tracking-[0.2em] text-white/28">
                    {item.number}
                  </span>
                  {index === 0 ? (
                    <MapPinned
                      size={18}
                      strokeWidth={1.25}
                      className="text-white/35"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <div className="mt-12">
                  <h3 className="text-xl font-medium tracking-[-0.04em] text-white/86">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/46">
                    {item.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-20 grid grid-cols-12 gap-y-8 border-t border-white/12 pt-7 lg:gap-x-8">
          <p className="eyebrow col-span-12 lg:col-span-3">
            Funding and financial corridors
          </p>
          <HeadlineReveal
            className="col-span-12 lg:col-span-9 lg:col-start-4"
          >
            <h3 className="max-w-[1100px] text-[clamp(2.8rem,5vw,5.8rem)] font-medium leading-[0.88] tracking-[-0.065em] text-white/90">
              Find the pathway that fits the opportunity.
            </h3>
          </HeadlineReveal>
          <p className="col-span-12 max-w-2xl text-base leading-7 text-white/58 sm:col-span-9 sm:col-start-4 lg:col-span-5 lg:col-start-8">
            Homeowners, First Nations, municipalities, non-profits, landowners,
            and developers begin from different positions. House Delivery
            helps organize the project pathway and supporting documentation;
            funding and approvals remain subject to the applicable program and
            project review.
          </p>
        </div>

        <div className="mt-14 grid border-y border-white/12 lg:mt-16 lg:grid-cols-12">
          <figure className="relative aspect-[16/9] overflow-hidden bg-[#13151a] lg:col-span-7 lg:aspect-auto lg:h-full lg:border-r lg:border-white/12">
            <Image
              src={activeImage.src}
              alt={activeImage.alt}
              fill
              quality={90}
              sizes="(max-width: 1023px) 100vw, (max-width: 1599px) 58vw, 878px"
              style={{ imageRendering: "auto" }}
              className="object-cover object-[52%_center] render-crisp"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/[0.03]"
            />
          </figure>

          <div className="border-t border-white/12 py-8 lg:col-span-5 lg:border-t-0 lg:px-10 lg:py-10 xl:px-12">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/32">
              Select your pathway
            </p>

            <div
              role="tablist"
              aria-label="Funding and project pathways"
              className="mt-6 grid grid-cols-2 border-t border-white/10"
            >
              {pathways.map((pathway, index) => {
                const isActive = activePathway === pathway.id;
                const tabId = `proposed-funding-tab-${pathway.id}`;
                const panelId = `proposed-funding-panel-${pathway.id}`;

                return (
                  <button
                    key={pathway.id}
                    ref={(element) => {
                      tabRefs.current[index] = element;
                    }}
                    id={tabId}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={panelId}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => activatePathway(pathway.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    className={cn(
                      "group flex min-w-0 flex-col border-b border-white/10 px-3 py-4 text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white sm:px-4",
                      index % 2 === 1 && "border-l border-white/10",
                      isActive
                        ? "bg-white/[0.05] text-white"
                        : "text-white/40 hover:bg-white/[0.025] hover:text-white/72",
                    )}
                  >
                    <span className="text-[8px] tabular-nums tracking-[0.2em] text-white/28">
                      {pathway.number}
                    </span>
                    <span className="mt-3 text-xs font-medium leading-5 tracking-[-0.015em] sm:text-sm">
                      {pathway.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {pathways.map((pathway) => {
              const isActive = activePathway === pathway.id;
              const programs = audiencePathways[pathway.id];
              const featuredPrograms = programs.slice(0, 3);

              return (
                <div
                  key={pathway.id}
                  id={`proposed-funding-panel-${pathway.id}`}
                  role="tabpanel"
                  aria-labelledby={`proposed-funding-tab-${pathway.id}`}
                  tabIndex={0}
                  hidden={!isActive}
                  className="pt-8 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                >
                  <h3 className="max-w-xl text-[clamp(2rem,3vw,3.4rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/90">
                    {pathway.heading}
                  </h3>

                  <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
                    {pathway.body}
                  </p>

                  <div className="mt-7">
                    <p className="mb-3 text-[8px] uppercase tracking-[0.2em] text-white/28">
                      Featured pathways
                    </p>

                    <div className="border-t border-white/10">
                      {featuredPrograms.map((program, index) => (
                        <article
                          key={`${pathway.id}-${program.title}`}
                          className="border-b border-white/10 py-5"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[8px] tabular-nums tracking-[0.2em] text-white/24">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.16em] text-white/42">
                              <span
                                aria-hidden="true"
                                className="size-1 rounded-full bg-white/60"
                              />
                              {program.status}
                            </span>
                          </div>

                          <h4 className="mt-3 text-base font-medium leading-6 tracking-[-0.025em] text-white/86 sm:text-lg">
                            {program.title}
                          </h4>

                          <p className="mt-2 text-xs leading-5 text-white/48">
                            {program.fitNote}
                          </p>

                          <dl className="mt-3 space-y-2 text-[8px] uppercase leading-4 tracking-[0.14em]">
                            <div className="grid grid-cols-[58px_1fr] gap-3">
                              <dt className="text-white/24">Funder</dt>
                              <dd className="text-white/42">
                                {program.funder}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[58px_1fr] gap-3">
                              <dt className="text-white/24">Support</dt>
                              <dd className="text-white/42">
                                {program.supportType}
                              </dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>

                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`proposed-funding-all-${pathway.id}`}
                      onClick={() => setIsExpanded((expanded) => !expanded)}
                      className="group flex w-full items-center justify-between gap-6 border-b border-white/10 py-4 text-left text-[9px] font-semibold uppercase tracking-[0.17em] text-white/58 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white"
                    >
                      {isExpanded
                        ? "Show fewer pathways"
                        : `View all ${programs.length} pathways`}
                      <ChevronDown
                        size={14}
                        strokeWidth={1.4}
                        aria-hidden="true"
                        className={cn(
                          "shrink-0 transition-transform duration-300",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>
                </div>
              );
            })}

            <a
              href="#reserve"
              className="group mt-8 inline-flex items-center gap-4 border-b border-white/35 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75 transition-colors hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0c10]"
            >
              Explore your pathway
              <ArrowUpRight
                size={14}
                strokeWidth={1.4}
                aria-hidden="true"
                className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>
        </div>

        {pathways.map((pathway) => {
          const isVisible =
            activePathway === pathway.id && isExpanded;
          const programs = audiencePathways[pathway.id];
          const additionalPrograms = programs.slice(3);

          return (
            <div
              key={`all-${pathway.id}`}
              id={`proposed-funding-all-${pathway.id}`}
              hidden={!isVisible}
              className="mt-10 border-y border-white/12"
            >
              <div className="flex flex-col gap-3 border-b border-white/10 py-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                    Additional pathways
                  </p>
                  <p className="mt-2 text-sm text-white/62">
                    {pathway.label}
                  </p>
                </div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                  {additionalPrograms.length} additional / {programs.length}{" "}
                  total
                </p>
              </div>

              {additionalPrograms.map((program, index) => (
                <article
                  key={`additional-${pathway.id}-${program.title}`}
                  className="grid grid-cols-12 gap-x-4 gap-y-7 border-b border-white/10 py-7 last:border-b-0 lg:gap-x-6"
                >
                  <span className="col-span-2 pt-1 text-[9px] tabular-nums tracking-[0.2em] text-white/28 lg:col-span-1">
                    {String(index + 4).padStart(2, "0")}
                  </span>

                  <div className="col-span-10 lg:col-span-5">
                    <h4 className="max-w-xl text-lg font-medium leading-tight tracking-[-0.035em] text-white/86 sm:text-xl">
                      {program.title}
                    </h4>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
                      {program.fitNote}
                    </p>
                  </div>

                  <dl className="col-span-10 col-start-3 grid grid-cols-2 gap-x-5 gap-y-5 lg:col-span-6 lg:col-start-auto lg:contents">
                    <div className="lg:col-span-2">
                      <dt className="text-[8px] uppercase tracking-[0.18em] text-white/24 lg:sr-only">
                        Funder
                      </dt>
                      <dd className="mt-2 text-[9px] uppercase leading-5 tracking-[0.14em] text-white/44 lg:mt-0">
                        {program.funder}
                      </dd>
                    </div>

                    <div className="lg:col-span-2">
                      <dt className="text-[8px] uppercase tracking-[0.18em] text-white/24 lg:sr-only">
                        Support
                      </dt>
                      <dd className="mt-2 text-[9px] uppercase leading-5 tracking-[0.14em] text-white/44 lg:mt-0">
                        {program.supportType}
                      </dd>
                    </div>

                    <div className="col-span-2 lg:col-span-2 lg:text-right">
                      <dt className="text-[8px] uppercase tracking-[0.18em] text-white/24 lg:sr-only">
                        Status
                      </dt>
                      <dd className="mt-2 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-white/44 lg:mt-0">
                        <span
                          aria-hidden="true"
                          className="size-1 rounded-full bg-white/60"
                        />
                        {program.status}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
