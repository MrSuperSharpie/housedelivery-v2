import { getRequiredCategories } from "@/data/home-configurator";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import { catalogModels } from "@/data/catalog";
import { models } from "@/data/models";
import type {
  FundingCorridor,
  PlannerCatalogItem,
  PlanningBasis,
} from "@/lib/project-planner";

const sharedAssumptions = [
  "Preliminary planning only; project scope, site conditions and procurement pathway remain subject to review.",
  "Current House Delivery model information is used as the portfolio starting point.",
] as const;

const sharedExclusions = [
  "Land, financing costs, taxes and funding proceeds.",
  "Project-specific professional review, adaptation, engineering, permitting and jurisdictional approvals.",
  "Unconfirmed site works, servicing, foundations, logistics, assembly and local completion scope.",
] as const;

function underReviewBasis(modelId: string): PlanningBasis {
  return {
    modelId,
    currency: "CAD",
    low: null,
    base: null,
    high: null,
    assumptions: sharedAssumptions,
    exclusions: sharedExclusions,
    source: "House Delivery commercial review",
    confidence: "early",
    status: "under-review",
  };
}

function getHomesPerCatalogueSelection(slug: string) {
  if (slug === "bc-duplex") return 2;
  if (slug === "bc-fourplex-1" || slug === "bc-fourplex-2") return 4;
  if (slug === "bc-rowhouse") return 3;
  if (slug === "sixplex-courtyard") return 6;
  return 1;
}

function parseSquareFeet(value: string) {
  return Number(value.replaceAll(",", ""));
}

const customHomes: readonly PlannerCatalogItem[] = models.map((model) => {
  const registration = getHomeConfiguratorRegistration(
    "custom-home",
    model.slug,
  );
  const definition = registration?.definition;
  const chapters = definition
    ? getRequiredCategories(definition).map((category) => ({
        id: category.id,
        number: category.number,
        title: category.title,
        options:
          category.kind === "room-look" || category.kind === "standard"
            ? category.options.map((option) => ({
                id: option.id,
                label: option.name,
                level: option.level,
                status: "Visual Direction" as const,
              }))
            : [],
      }))
    : [];

  return {
    id: `custom:${model.slug}`,
    family: "custom-home",
    name: model.name,
    squareFeet: model.squareFeet,
    homesPerSelection: 1,
    image: model.heroImage,
    description: model.summary,
    viewHref: `/homes/${model.slug}`,
    walkthroughHref:
      "video" in model && model.video
        ? `/homes/${model.slug}#film`
        : undefined,
    buildMyHref: definition ? `/homes/${model.slug}#home-inclusions` : undefined,
    lookBookHref: definition ? `/homes/${model.slug}#home-look-book` : undefined,
    designChapters: chapters,
    planningBasis: underReviewBasis(`custom:${model.slug}`),
  };
});

const standardizedCatalogueHomes: readonly PlannerCatalogItem[] =
  catalogModels.map((model) => ({
    id: `catalogue:${model.slug}`,
    family: "standardized-catalogue" as const,
    name: model.name,
    code: model.code,
    squareFeet: parseSquareFeet(model.squareFootage),
    homesPerSelection: getHomesPerCatalogueSelection(model.slug),
    image: model.image,
    description: model.description,
    viewHref: `/catalog/${model.slug}`,
    designChapters: [],
    planningBasis: underReviewBasis(`catalogue:${model.slug}`),
  }));

export const firstNationsPlannerCatalog = [
  ...standardizedCatalogueHomes,
  ...customHomes,
] as const satisfies readonly PlannerCatalogItem[];

export const firstNationsFundingCorridors = [
  {
    id: "build-canada-homes",
    title: "Build Canada Homes",
    organization: "Housing, Infrastructure and Communities Canada",
    supportType: "Affordable housing investment and delivery partnership",
    officialSource:
      "https://housing-infrastructure.canada.ca/bch-mc/index-eng.html",
    landStatus: ["either"],
    region: "canada",
    priorities: [
      "affordability",
      "scale",
      "modern-methods",
      "community-housing",
    ],
    whyItMayFit:
      "The working portfolio may align with affordable, Indigenous-led, portfolio-scale and modern-methods priorities.",
    confirmationNeeded:
      "Confirm proponent eligibility, affordability outcomes, land, delivery readiness and the appropriate proposal pathway.",
  },
  {
    id: "isc-on-reserve-housing",
    title: "First Nations On-Reserve Housing Program",
    organization: "Indigenous Services Canada",
    supportType: "Housing and capacity support",
    officialSource:
      "https://www.sac-isc.gc.ca/eng/1100100010752/1535115367287",
    landStatus: ["on-reserve"],
    region: "canada",
    priorities: ["community-housing"],
    whyItMayFit:
      "This is a foundational corridor to discuss where the proposed homes are on reserve and community-led.",
    confirmationNeeded:
      "Confirm regional program process, available allocations, eligible scope and required community documentation.",
  },
  {
    id: "cmhc-section-95",
    title: "On-Reserve Non-Profit Housing Program (Section 95)",
    organization: "CMHC",
    supportType: "Non-profit rental subsidy and loan support",
    officialSource:
      "https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/funding-programs/all-funding-programs/on-reserve-non-profit-housing-program-section-95",
    landStatus: ["on-reserve"],
    region: "canada",
    priorities: ["affordability", "rental", "community-housing"],
    whyItMayFit:
      "It may be relevant where the project is structured as affordable non-profit rental housing on reserve.",
    confirmationNeeded:
      "Confirm tenure, operating model, project viability, loan structure and CMHC application requirements.",
  },
  {
    id: "isc-ministerial-loan-guarantee",
    title: "Ministerial Loan Guarantees",
    organization: "Indigenous Services Canada",
    supportType: "Loan security for on-reserve housing",
    officialSource:
      "https://www.sac-isc.gc.ca/eng/1100100010759/1533297595541",
    landStatus: ["on-reserve"],
    region: "canada",
    priorities: ["community-housing"],
    whyItMayFit:
      "It may support lender security for eligible housing loans where reserve land limits conventional mortgage security.",
    confirmationNeeded:
      "Confirm the borrower, lender, eligible loan purpose, regional process and guarantee capacity.",
  },
  {
    id: "cmhc-aclp",
    title: "Apartment Construction Loan Program",
    organization: "CMHC",
    supportType: "Low-cost construction financing",
    officialSource:
      "https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/funding-programs/all-funding-programs/apartment-construction-loan-program",
    landStatus: ["either"],
    region: "canada",
    priorities: ["affordability", "rental", "scale", "modern-methods"],
    whyItMayFit:
      "A multi-home rental portfolio may warrant review against CMHC construction-financing criteria.",
    confirmationNeeded:
      "Confirm rental tenure, minimum loan and unit requirements, borrower strength, affordability and underwriting criteria.",
  },
  {
    id: "bc-indigenous-housing-fund",
    title: "Indigenous Housing Fund",
    organization: "BC Housing",
    supportType: "Indigenous affordable housing capital and operating support",
    officialSource:
      "https://www.bchousing.org/indigenous/on-nation-housing",
    landStatus: ["either"],
    region: "bc",
    priorities: ["affordability", "rental", "community-housing"],
    whyItMayFit:
      "It may be relevant to Indigenous affordable rental housing in British Columbia, on or off reserve.",
    confirmationNeeded:
      "Confirm current intake, proponent structure, partnership requirements, affordability and eligible project stage.",
  },
  {
    id: "bc-builds",
    title: "BC Builds",
    organization: "BC Housing",
    supportType: "Middle-income rental financing and land partnership",
    officialSource:
      "https://www.bchousing.org/projects-partners/funding-programs/bc-builds",
    landStatus: ["either"],
    region: "bc",
    priorities: ["affordability", "rental", "scale"],
    whyItMayFit:
      "It may be relevant where controlled land can support middle-income rental housing in British Columbia.",
    confirmationNeeded:
      "Confirm land readiness, rental affordability, ownership structure, financing fit and current BC Builds process.",
  },
] as const satisfies readonly FundingCorridor[];

export const plannerPhaseLabels = {
  "phase-1": "Active / First Build",
  "phase-2": "Near-Term / Next Build",
  future: "Future Pipeline",
} as const;
