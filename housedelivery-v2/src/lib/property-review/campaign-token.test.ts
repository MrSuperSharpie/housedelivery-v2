import assert from "node:assert/strict";
import test from "node:test";
import { sealCampaignReview, openCampaignReview } from "./campaign-token";
import type { PropertyReviewResult } from "./types";
const review: PropertyReviewResult = { submittedAddress: "123 Test Street, Vancouver, BC", normalizedAddress: "123 Test Street, Vancouver, BC", municipality: "Vancouver", propertyType: "Detached house", strataIndicator: "NO", multifamilyIndicator: false, commercialIndicator: false, industrialIndicator: false, appearsUnusuallyComplex: false, complexityReasons: [], leadState: "GREEN", leadStateLabel: "PROMISING", recommendedNextAction: "REVIEW", matchedRules: [], screening: "LIKELY CANDIDATE", reason: "Example result", dataSources: [], zoningDistrict: "R1-1", parcelGeometry: { type: "Polygon", coordinates: [] } };
test("encrypted review is bound to the form, property, municipality and expiry", () => {
  const secret="test-secret", nonce="form-reference", now=1_800_000_000_000;
  const token=sealCampaignReview(review,"123 Test Street","Vancouver",nonce,secret,now);
  assert.equal(token.includes("Vancouver"),false,"internal property data is encrypted");
  const reopened=openCampaignReview(token,"123 Test Street","Vancouver",nonce,secret,now+1000);
  assert.equal(reopened?.leadState,"GREEN"); assert.equal(reopened?.parcelGeometry,undefined);
  assert.equal(openCampaignReview(token,"999 Other Street","Vancouver",nonce,secret,now+1000),undefined);
  assert.equal(openCampaignReview(token,"123 Test Street","Burnaby",nonce,secret,now+1000),undefined);
  assert.equal(openCampaignReview(token,"123 Test Street","Vancouver","another-form",secret,now+1000),undefined);
  assert.equal(openCampaignReview(token,"123 Test Street","Vancouver",nonce,"wrong-secret",now+1000),undefined);
  assert.equal(openCampaignReview(token,"123 Test Street","Vancouver",nonce,secret,now+2*60*60*1000+1),undefined);
  const tampered=(token[0]==="A"?"B":"A")+token.slice(1);
  assert.equal(openCampaignReview(tampered,"123 Test Street","Vancouver",nonce,secret,now+1000),undefined);
});
