import assert from "node:assert/strict";
import test from "node:test";
import { lookBookProjectReviewHref } from "./project-review";
import { projectNextStepDescription, projectConfirmationCopy, projectVisualizationCopy } from "@/data/project-next-steps";
import { homeConfiguratorRegistrations } from "@/data/home-configurators";

test("project links reuse a saved capability or the existing model inquiry",()=>{
 const id="9342f2c1-8db8-4f09-a42a-f791d81b9407";
 assert.equal(lookBookProjectReviewHref('aurora',id),`/lookbook/${id}?projectReview=1#lookbook-property-form`);
 assert.equal(lookBookProjectReviewHref('aurora'), '/?model=aurora#reserve');
 assert.equal(lookBookProjectReviewHref('aurora','<script>'), '/?model=aurora#reserve');
});
test("all eighteen model finales receive the approved second and third steps without rewriting their first step",()=>{
 const definitions=homeConfiguratorRegistrations.filter(r=>r.productFamily==='custom-home'&&r.definition);
 assert.equal(definitions.length,18);
 for(const r of definitions){const steps=r.definition!.lookBook.nextStageSteps;assert.equal(steps.length,3);assert.equal(projectNextStepDescription(steps[0]),steps[0].description);assert.equal(projectNextStepDescription(steps[1]),projectConfirmationCopy);assert.equal(projectNextStepDescription(steps[2]),projectVisualizationCopy);}
});
