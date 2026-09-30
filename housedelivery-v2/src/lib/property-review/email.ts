import {
  buildPublicPropertySnapshot,
  formatPropertyArea,
} from "@/lib/property-review/snapshot";
import type { PropertyReviewResult } from "@/lib/property-review/types";

const divider = "================================";
const technicalDivider = "----------------------------------";

export type PropertyLeadContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  considering?: string;
  ownership?: string;
  desiredStart?: string;
};

type CustomerPropertyEmail = ReturnType<typeof buildPropertyCustomerEmail>;

export function buildPropertyEmailMessages({
  from,
  customerEmail,
  internalRecipient,
  internalCopyRecipient,
  internalSubject,
  internalText,
  customer,
}: {
  from: string;
  customerEmail: string;
  internalRecipient: string;
  internalCopyRecipient: string;
  internalSubject: string;
  internalText: string;
  customer: CustomerPropertyEmail;
}) {
  return {
    internal: {
      from,
      to: [internalRecipient],
      cc: [internalCopyRecipient],
      reply_to: customerEmail,
      subject: internalSubject,
      text: internalText,
    },
    customer: {
      from,
      to: [customerEmail],
      reply_to: internalRecipient,
      subject: customer.subject,
      text: customer.text,
      html: customer.html,
    },
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

function valueOrUnknown(value?: string) {
  return value || "Not confidently determined";
}

function formatParcelArea(squareMetres?: number) {
  return formatPropertyArea(squareMetres) ?? "Not confidently determined";
}

function formatCentroid(result: PropertyReviewResult) {
  if (!result.parcelCentroid) return "Not confidently determined";
  return `${result.parcelCentroid.latitude.toFixed(6)}, ${result.parcelCentroid.longitude.toFixed(6)}`;
}

function complexityLabel(result: PropertyReviewResult) {
  return result.appearsUnusuallyComplex
    ? `Appears unusually complex — ${result.complexityReasons.join("; ")}`
    : "No unusual complexity identified from the available municipal records.";
}

function formatSourceEvidence(result: PropertyReviewResult) {
  if (!result.sourceEvidence?.length) {
    return result.dataSources.length
      ? result.dataSources.join("; ")
      : "No municipal data source completed successfully.";
  }
  return result.sourceEvidence
    .map((source) =>
      [
        `${source.kind}: ${source.name}`,
        `Use: ${source.usage || "QUERIED"}`,
        `Reference: ${source.url}`,
        `Checked: ${source.checkedAt}`,
        ...(source.datasetUpdatedAt
          ? [`Dataset updated: ${source.datasetUpdatedAt}`]
          : []),
        ...(source.bylawVersion ? [`Version: ${source.bylawVersion}`] : []),
        ...(source.effectiveDate
          ? [`Effective: ${source.effectiveDate}`]
          : []),
        `Confidence: ${source.confidence}`,
      ].join("\n"),
    )
    .join("\n\n");
}

export function formatPropertyReviewEmailSection(
  result: PropertyReviewResult,
) {
  const ruleLines = result.matchedRules.flatMap((rule) => [
    `Rule: ${rule.ruleId}`,
    `Municipality: ${rule.municipality || result.municipality}`,
    `Result: ${rule.result}`,
    `Confidence: ${rule.confidence}`,
    `Source: ${rule.source}`,
    ...(rule.sourceAuthority
      ? [`Source authority: ${rule.sourceAuthority}`]
      : []),
    ...(rule.sourceDocument
      ? [`Source document: ${rule.sourceDocument}`]
      : []),
    ...(rule.sourceSection ? [`Source section: ${rule.sourceSection}`] : []),
    ...(rule.effectiveDate ? [`Effective: ${rule.effectiveDate}`] : []),
    ...(rule.lastChecked ? [`Rule checked: ${rule.lastChecked}`] : []),
    ...(rule.machineCondition
      ? [`Machine condition: ${rule.machineCondition}`]
      : []),
    `Explanation: ${rule.explanation}`,
    "",
  ]);
  const lines = [
    "PROPERTY INTELLIGENCE",
    "",
    `Submitted address: ${result.submittedAddress || "Not supplied"}`,
    `Normalized property: ${result.normalizedAddress || "Not confidently determined"}`,
    `Submitted unit: ${valueOrUnknown(result.submittedUnit)}`,
    `Municipality: ${result.municipality}`,
    `Jurisdiction: ${valueOrUnknown(result.jurisdiction)}`,
    `Identified authority: ${valueOrUnknown(result.identifiedAuthority)}`,
    `Regional area: ${valueOrUnknown(result.regionalArea)}`,
    `Provider status: ${result.providerStatus || "Not confidently determined"}`,
    `Property type: ${result.propertyType}`,
    `Zoning: ${valueOrUnknown(result.zoningDistrict)}`,
    `Zoning classification: ${valueOrUnknown(result.zoningClassification)}`,
  ];

  if (result.cd1Designation) {
    lines.push(`CD-1: ${result.cd1Designation}`);
  }

  lines.push(
    `Site ID: ${valueOrUnknown(result.siteId)}`,
    `Tax coordinate: ${valueOrUnknown(result.taxCoordinate)}`,
    `Approximate parcel size: ${formatParcelArea(result.approximateParcelAreaSquareMetres)}`,
    `Parcel centroid: ${formatCentroid(result)}`,
    `Rear access: ${result.rearAccessIndicator || "Not determined"}`,
    `ALR: ${result.alrIndicator || "Not determined"}`,
    `Floodplain: ${result.floodplainIndicator || "Not determined"}`,
    `Environmental / watercourse constraint: ${result.environmentalConstraintIndicator || "Not determined"}`,
    `Development permit area: ${result.developmentPermitAreaIndicator || "Not determined"}`,
    `Strata indicator: ${result.strataIndicator}`,
    `Multifamily indicator: ${result.multifamilyIndicator ? "YES" : "NO"}`,
    `Commercial indicator: ${result.commercialIndicator ? "YES" : "NO"}`,
    `Industrial indicator: ${result.industrialIndicator ? "YES" : "NO"}`,
    `Complexity: ${complexityLabel(result)}`,
    "",
    "HOUSE DELIVERY ASSESSMENT",
    "",
    `Classification: ${result.leadState} — ${result.leadStateLabel}`,
    `Reason: ${result.reason}`,
    `Recommended next action: ${result.recommendedNextAction}`,
    "",
    "RULE DETAIL",
    "",
    ...ruleLines,
    "PROPERTY DATA SOURCES",
    "",
    formatSourceEvidence(result),
    ...(result.failureCode
      ? ["", `Internal failure code: ${result.failureCode}`]
      : []),
    "",
    "DISCLAIMER",
    "",
    "This is an automated preliminary screening only. Zoning, development potential, site conditions and permitting requirements must be independently verified before any representation is made to the property owner.",
  );

  return lines.join("\n");
}

export function appendPropertyReviewToLeadEmail(
  existingLeadEmail: string,
  result: PropertyReviewResult,
  contact?: PropertyLeadContact,
) {
  const contactLines = contact
    ? [
        `Name: ${contact.firstName} ${contact.lastName}`,
        `Email: ${contact.email}`,
        `Phone: ${contact.phone || "Not provided"}`,
        `Property: ${result.normalizedAddress || result.submittedAddress}`,
        "",
        `Considering: ${contact.considering || "Not provided"}`,
        `Property ownership: ${contact.ownership || "Not provided"}`,
        `Desired start: ${contact.desiredStart || "Not provided"}`,
      ]
    : [`Property: ${result.normalizedAddress || result.submittedAddress}`];

  return [
    divider,
    "HOUSE DELIVERY PROPERTY LEAD",
    `${result.leadState} — ${result.leadStateLabel}`,
    divider,
    "",
    `Municipality: ${result.municipality}`,
    `Jurisdiction: ${result.jurisdiction || result.municipality}`,
    "",
    ...contactLines,
    "",
    formatPropertyReviewEmailSection(result),
    "",
    technicalDivider,
    "ORIGINAL INQUIRY NOTIFICATION",
    technicalDivider,
    "",
    existingLeadEmail,
  ].join("\n");
}

export function buildPropertyCustomerEmail({
  firstName,
  review,
  origin,
}: {
  firstName: string;
  review: PropertyReviewResult;
  origin: string;
}) {
  const snapshot = buildPublicPropertySnapshot(review);
  const normalizedOrigin = origin.replace(/\/$/, "");
  const safeFirstName = escapeHtml(firstName);
  const safeAddress = escapeHtml(snapshot.address);
  const safeMunicipality = escapeHtml(snapshot.municipality);
  const safeZoning = escapeHtml(
    snapshot.zoning || "Additional review required",
  );
  const safePropertyType = escapeHtml(snapshot.propertyType);
  const safeLotSize = escapeHtml(
    snapshot.approximateLotSize || "Additional review required",
  );
  const disclaimer =
    "This is a preliminary automated review, not a zoning determination, permit approval, survey, engineering opinion, or guarantee. Final feasibility depends on municipal review and site-specific conditions.";

  let subject: string;
  let text: string;
  let htmlBody: string;

  if (snapshot.status === "green") {
    subject = "We checked your property — here’s what we found";
    text = [
      "HOUSE DELIVERY",
      "",
      "YOUR PROPERTY LOOKS PROMISING",
      "",
      `Hi ${firstName},`,
      "",
      `We’ve completed the first review of ${snapshot.address}.`,
      "",
      "Based on the property and municipal information currently available, your property appears worth exploring for a House Delivery laneway or backyard home.",
      "",
      "PROPERTY SNAPSHOT",
      `Municipality: ${snapshot.municipality}`,
      `Zoning: ${snapshot.zoning || "Additional review required"}`,
      `Property type: ${snapshot.propertyType}`,
      `Approximate lot size: ${snapshot.approximateLotSize || "Additional review required"}`,
      "",
      "WHAT THIS COULD MEAN",
      "Your property appears to have the characteristics we look for when assessing a potential laneway or backyard home.",
      "",
      "HOMES WORTH EXPLORING",
      "We’re reviewing which House Delivery homes may be the strongest fit for your property.",
      "",
      `Book My Property Review: ${normalizedOrigin}/#reserve`,
      `Explore the homes: ${normalizedOrigin}/#carriage-homes-grid`,
      "",
      disclaimer,
      "",
      "House Delivery",
    ].join("\n");
    htmlBody = `<p style="font-size:16px;line-height:1.7;color:#55524c">Hi ${safeFirstName},</p><h1 style="font-size:42px;line-height:1.02;letter-spacing:-.04em;margin:18px 0 24px">Your property looks promising.</h1><p style="font-size:16px;line-height:1.7;color:#55524c">Based on the property and municipal information currently available, <strong>${safeAddress}</strong> appears worth exploring for a House Delivery laneway or backyard home.</p>${snapshotTable({ municipality: safeMunicipality, zoning: safeZoning, propertyType: safePropertyType, lotSize: safeLotSize })}<div style="border-top:1px solid #aaa59a;margin-top:34px;padding-top:28px"><p style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#605d56">What this could mean</p><p style="font-size:16px;line-height:1.7;color:#55524c">Your property appears to have the characteristics we look for when assessing a potential laneway or backyard home.</p><p style="font-size:15px;line-height:1.7;color:#55524c"><strong>Homes worth exploring</strong><br>We’re reviewing which House Delivery homes may be the strongest fit for your property.</p><p style="margin:30px 0 16px"><a href="${normalizedOrigin}/#reserve" style="display:inline-block;background:#111216;color:#fff;text-decoration:none;padding:17px 24px;font-size:11px;letter-spacing:.14em;text-transform:uppercase">Book My Property Review</a></p><p><a href="${normalizedOrigin}/#carriage-homes-grid" style="color:#111216;font-size:12px;text-transform:uppercase;letter-spacing:.12em">Explore the homes</a></p></div>`;
  } else if (snapshot.status === "red") {
    subject = "We’ve reviewed your property";
    text = [
      "HOUSE DELIVERY",
      "",
      `Hi ${firstName},`,
      "",
      `Thanks for asking us to review ${snapshot.address}.`,
      "",
      snapshot.message,
      "",
      "If you have another property you’d like us to check, we’d be happy to take a look.",
      "",
      `Check Another Property: ${normalizedOrigin}/#laneway-property-review`,
      "",
      disclaimer,
      "",
      "House Delivery",
    ].join("\n");
    htmlBody = `<p style="font-size:16px;line-height:1.7;color:#55524c">Hi ${safeFirstName},</p><h1 style="font-size:42px;line-height:1.02;letter-spacing:-.04em;margin:18px 0 24px">We’ve reviewed your property.</h1><p style="font-size:16px;line-height:1.7;color:#55524c">Thanks for asking us to review <strong>${safeAddress}</strong>.</p><p style="font-size:16px;line-height:1.7;color:#55524c">${escapeHtml(snapshot.message)}</p><p style="font-size:16px;line-height:1.7;color:#55524c">If you have another property you’d like us to check, we’d be happy to take a look.</p><p style="margin:30px 0 16px"><a href="${normalizedOrigin}/#laneway-property-review" style="display:inline-block;background:#111216;color:#fff;text-decoration:none;padding:17px 24px;font-size:11px;letter-spacing:.14em;text-transform:uppercase">Check Another Property</a></p>`;
  } else {
    subject = "We’ve started reviewing your property";
    text = [
      "HOUSE DELIVERY",
      "",
      "WE'RE TAKING A CLOSER LOOK",
      "",
      `Hi ${firstName},`,
      "",
      `We’ve completed the first automated review of ${snapshot.address}.`,
      "",
      "We found your property, but there are details that need to be reviewed before we make a recommendation.",
      "",
      `Municipality: ${snapshot.municipality}`,
      "",
      "Nothing is required from you right now. Our team will review the property and determine the next step. We’ll be in touch shortly.",
      "",
      disclaimer,
      "",
      "House Delivery",
    ].join("\n");
    htmlBody = `<p style="font-size:16px;line-height:1.7;color:#55524c">Hi ${safeFirstName},</p><h1 style="font-size:42px;line-height:1.02;letter-spacing:-.04em;margin:18px 0 24px">We’re taking a closer look.</h1><p style="font-size:16px;line-height:1.7;color:#55524c">We found <strong>${safeAddress}</strong>, but there are details that need to be reviewed before we make a recommendation.</p><p style="font-size:14px;line-height:1.7;color:#55524c"><strong>Municipality:</strong> ${safeMunicipality}</p><p style="font-size:16px;line-height:1.7;color:#55524c">Nothing is required from you right now. Our team will review the property and determine the next step. We’ll be in touch shortly.</p>`;
  }

  const html = `<!doctype html><html><body style="margin:0;background:#e7e3d8;color:#111216;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:48px 24px"><p style="font-size:11px;letter-spacing:.2em;font-weight:700">HOUSE DELIVERY</p><div style="border-top:1px solid #a6a197;margin-top:28px;padding-top:36px">${htmlBody}</div><p style="margin-top:48px;border-top:1px solid #a6a197;padding-top:24px;font-size:12px;line-height:1.6;color:#69655e">${escapeHtml(disclaimer)}<br><br>Questions? Reply to this email or contact hello@housedelivery.ca.</p></div></body></html>`;

  return { subject, text, html, snapshot };
}

function snapshotTable({
  municipality,
  zoning,
  propertyType,
  lotSize,
}: {
  municipality: string;
  zoning: string;
  propertyType: string;
  lotSize: string;
}) {
  const rows = [
    ["Municipality", municipality],
    ["Zoning", zoning],
    ["Property type", propertyType],
    ["Approximate lot size", lotSize],
  ];
  return `<div style="margin-top:32px;border-top:1px solid #aaa59a"><p style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#605d56;margin:24px 0">Property snapshot</p>${rows.map(([label, value]) => `<div style="display:flex;justify-content:space-between;gap:24px;border-top:1px solid #c7c1b6;padding:13px 0"><span style="font-size:12px;color:#69655e">${label}</span><strong style="font-size:12px;text-align:right">${value}</strong></div>`).join("")}</div>`;
}
