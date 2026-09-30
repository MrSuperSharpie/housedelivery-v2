import type {
  PropertyLeadState,
  PropertyRuleResult,
  PropertyScreening,
} from "@/lib/property-review/types";

export const vancouverRuleSources = {
  parcel:
    "City of Vancouver Open Data — Property parcel polygons (https://opendata.vancouver.ca/explore/dataset/property-parcel-polygons/; SITE_ID identifies strata plans when alphanumeric)",
  propertyTax:
    "City of Vancouver Open Data — Property tax report (https://opendata.vancouver.ca/explore/dataset/property-tax-report/; legal type and zoning cross-check)",
  zoning:
    "City of Vancouver Open Data — Zoning districts and labels (https://opendata.vancouver.ca/explore/dataset/zoning-districts-and-labels/)",
  r1Laneway:
    "City of Vancouver — Housing options in lower density areas (https://vancouver.ca/people-programs/housing-options-in-lower-density-areas.aspx) and R1-1 District Schedule (https://bylaws.vancouver.ca/zoning/zoning-by-law-district-schedule-r1-1.pdf)",
} as const;

const vancouverRuleLastChecked = "2026-09-29";

function auditedVancouverRule(
  rule: PropertyRuleResult,
): PropertyRuleResult {
  const shared = {
    ...rule,
    municipality: "City of Vancouver",
    sourceAuthority: "City of Vancouver",
    lastChecked: vancouverRuleLastChecked,
  };
  if (rule.ruleId === "VAN-GREEN-R1-001") {
    return {
      ...shared,
      sourceDocument:
        "R1-1 District Schedule and Housing options in lower-density areas",
      sourceSection: "R1-1 laneway-house use and regulation guidance",
      machineCondition:
        "One exact non-strata LAND parcel; residential-inclusive R1/RS zoning; no CD-1 or geometry complexity flag.",
    };
  }
  if (rule.ruleId === "VAN-RED-STRATA-001") {
    return {
      ...shared,
      sourceDocument:
        "Property Parcel Polygons and Property Tax Report datasets",
      sourceSection: "site_id and legal_type fields",
      machineCondition:
        "legal_type is STRATA or site_id contains both letters and digits.",
    };
  }
  if (
    rule.ruleId === "VAN-RED-COMMERCIAL-001" ||
    rule.ruleId === "VAN-RED-INDUSTRIAL-001"
  ) {
    return {
      ...shared,
      sourceDocument: "Zoning Districts and Labels dataset",
      sourceSection:
        "zoning_classification, zoning_category and zoning_district fields",
      machineCondition:
        "Official zoning fields identify a commercial-only or industrial-only classification.",
    };
  }
  if (rule.ruleId === "VAN-YELLOW-CD1-001") {
    return {
      ...shared,
      sourceDocument: "Zoning Districts and Labels dataset",
      sourceSection: "cd_1_number, zoning_category and zoning_district fields",
      machineCondition:
        "A CD-1 designation or comprehensive-development zoning requires site-specific review.",
    };
  }
  if (rule.ruleId === "VAN-YELLOW-PARCEL-001") {
    return {
      ...shared,
      sourceDocument: "Property Parcel Polygons dataset",
      sourceSection: "parcel geometry and calculated area checks",
      machineCondition:
        "Parcel geometry is missing, multipart, unusually detailed or outside the conservative area range.",
    };
  }
  return {
    ...shared,
    sourceDocument:
      "Property Tax Report and Zoning Districts and Labels datasets",
    sourceSection: "legal_type and zoning classification cross-check",
    machineCondition:
      "Official data resolves, but no reviewed Green or Red rule applies.",
  };
}

type VancouverRuleInput = {
  zoningDistrict: string;
  zoningClassification: string;
  zoningCategory: string;
  cd1Designation?: string;
  legalType: string;
  siteId: string;
  submittedUnit?: string;
  complexityReasons: string[];
};

export type VancouverRuleAssessment = {
  leadState: PropertyLeadState;
  leadStateLabel: string;
  screening: PropertyScreening;
  propertyType: string;
  strataIndicator: "YES" | "NO" | "NOT CONFIDENTLY DETERMINED";
  multifamilyIndicator: boolean;
  commercialIndicator: boolean;
  industrialIndicator: boolean;
  reason: string;
  recommendedNextAction: string;
  matchedRules: PropertyRuleResult[];
};

function isAlphanumericStrataSiteId(siteId: string) {
  return /[A-Z]/i.test(siteId) && /\d/.test(siteId);
}

function resultForState(state: PropertyLeadState) {
  if (state === "GREEN") {
    return {
      leadStateLabel: "PROMISING PROPERTY",
      screening: "LIKELY CANDIDATE" as const,
      recommendedNextAction: "CONTACT / AUTOMATED NURTURE ACTIVE",
    };
  }
  if (state === "RED") {
    return {
      leadStateLabel: "NOT A CONVENTIONAL FIT",
      screening: "UNLIKELY CONVENTIONAL CANDIDATE" as const,
      recommendedNextAction: "NO IMMEDIATE ACTION REQUIRED",
    };
  }
  return {
    leadStateLabel: "HUMAN REVIEW REQUIRED",
    screening: "NEEDS REVIEW" as const,
    recommendedNextAction: "MANUAL PROPERTY REVIEW REQUIRED",
  };
}

function assessment(
  state: PropertyLeadState,
  rule: PropertyRuleResult,
  property: Pick<
    VancouverRuleAssessment,
    | "propertyType"
    | "strataIndicator"
    | "multifamilyIndicator"
    | "commercialIndicator"
    | "industrialIndicator"
  >,
): VancouverRuleAssessment {
  return {
    leadState: state,
    ...resultForState(state),
    ...property,
    reason: rule.explanation,
    matchedRules: [auditedVancouverRule(rule)],
  };
}

export function assessVancouverProperty(
  input: VancouverRuleInput,
): VancouverRuleAssessment {
  const district = input.zoningDistrict.toUpperCase();
  const classification = input.zoningClassification.toUpperCase();
  const category = input.zoningCategory.toUpperCase();
  const legalType = input.legalType.toUpperCase();
  const strata =
    legalType === "STRATA" || isAlphanumericStrataSiteId(input.siteId);
  const commercial =
    classification.includes("COMMERCIAL") ||
    ["C", "FC", "HA"].includes(category) ||
    /^C-/.test(district);
  const industrial =
    classification.includes("INDUSTRIAL") ||
    ["I", "IC", "MC", "M"].includes(category) ||
    /^(?:I|IC|MC|M)-/.test(district);

  if (strata) {
    return assessment(
      "RED",
      {
        ruleId: "VAN-RED-STRATA-001",
        source: `${vancouverRuleSources.parcel}; ${vancouverRuleSources.propertyTax}`,
        explanation:
          "Official City records identify this as a strata property. It is therefore not a conventional detached-lot laneway or carriage-home lead.",
        result: "RED",
        confidence: "HIGH",
      },
      {
        propertyType: input.submittedUnit
          ? "Strata unit / multifamily property"
          : "Strata / multifamily property",
        strataIndicator: "YES",
        multifamilyIndicator: true,
        commercialIndicator: commercial,
        industrialIndicator: industrial,
      },
    );
  }

  if (commercial || industrial) {
    const propertyType = industrial
      ? "Industrial property"
      : "Commercial property";
    return assessment(
      "RED",
      {
        ruleId: industrial
          ? "VAN-RED-INDUSTRIAL-001"
          : "VAN-RED-COMMERCIAL-001",
        source: vancouverRuleSources.zoning,
        explanation: `Official zoning identifies this as ${propertyType.toLowerCase()}, which is not a conventional detached-lot laneway or carriage-home lead.`,
        result: "RED",
        confidence: "HIGH",
      },
      {
        propertyType,
        strataIndicator:
          legalType === "LAND" ? "NO" : "NOT CONFIDENTLY DETERMINED",
        multifamilyIndicator: false,
        commercialIndicator: commercial,
        industrialIndicator: industrial,
      },
    );
  }

  if (input.cd1Designation || category === "CD" || district.startsWith("CD-1")) {
    return assessment(
      "YELLOW",
      {
        ruleId: "VAN-YELLOW-CD1-001",
        source: vancouverRuleSources.zoning,
        explanation: `The parcel is in ${input.zoningDistrict} ${input.zoningClassification} zoning. Site-specific CD-1 controls require human review before House Delivery makes a property recommendation.`,
        result: "YELLOW",
        confidence: "HIGH",
      },
      {
        propertyType: "Property type requires review",
        strataIndicator:
          legalType === "LAND" ? "NO" : "NOT CONFIDENTLY DETERMINED",
        multifamilyIndicator: false,
        commercialIndicator: false,
        industrialIndicator: false,
      },
    );
  }

  if (input.complexityReasons.length) {
    return assessment(
      "YELLOW",
      {
        ruleId: "VAN-YELLOW-PARCEL-001",
        source: vancouverRuleSources.parcel,
        explanation: `The official parcel was found, but ${input.complexityReasons.join("; ")}. The site requires human review.`,
        result: "YELLOW",
        confidence: "MEDIUM",
      },
      {
        propertyType:
          legalType === "LAND"
            ? "Non-strata property requiring review"
            : "Property type requires review",
        strataIndicator:
          legalType === "LAND" ? "NO" : "NOT CONFIDENTLY DETERMINED",
        multifamilyIndicator: false,
        commercialIndicator: false,
        industrialIndicator: false,
      },
    );
  }

  const residentialInclusive =
    category === "R1" ||
    category === "RS" ||
    district === "R1-1" ||
    district.startsWith("RS-");
  if (legalType === "LAND" && residentialInclusive) {
    return assessment(
      "GREEN",
      {
        ruleId: "VAN-GREEN-R1-001",
        source: `${vancouverRuleSources.propertyTax}; ${vancouverRuleSources.zoning}; ${vancouverRuleSources.r1Laneway}`,
        explanation: `One non-strata parcel matched City records in ${input.zoningDistrict} ${input.zoningClassification} zoning. City guidance identifies laneway housing as an option in R1-1 lower-density areas, so this property is promising for further investigation. This is not a permit or approval determination.`,
        result: "GREEN",
        confidence: "MEDIUM",
      },
      {
        propertyType: "Non-strata residential parcel",
        strataIndicator: "NO",
        multifamilyIndicator: false,
        commercialIndicator: false,
        industrialIndicator: false,
      },
    );
  }

  return assessment(
    "YELLOW",
    {
      ruleId: "VAN-YELLOW-OTHER-001",
      source: `${vancouverRuleSources.propertyTax}; ${vancouverRuleSources.zoning}`,
      explanation: `The official parcel and ${input.zoningDistrict} zoning were identified, but the available authoritative data does not support a confident conventional laneway-home classification.`,
      result: "YELLOW",
      confidence: "LOW",
    },
    {
      propertyType:
        legalType === "LAND"
          ? "Non-strata property requiring review"
          : "Property type requires review",
      strataIndicator:
        legalType === "LAND" ? "NO" : "NOT CONFIDENTLY DETERMINED",
      multifamilyIndicator: false,
      commercialIndicator: false,
      industrialIndicator: false,
    },
  );
}
