// Founder-approved public project information; no supplier cost or margin data.
export const projectConfirmationCopy = "We confirm your selected products, project requirements and pricing. Your final quotation includes a comprehensive Bill of Materials detailing your home package.";
export const projectVisualizationCopy = "Experience your home before it's built. An optional personalized virtual walkthrough can bring your chosen design, materials and finishes to life.";
export const billOfMaterialsCopy = "Your final project quotation includes a comprehensive Bill of Materials listing the specified products, materials, finishes and quantities in your agreed housing-package scope. Proprietary supplier costs and House Delivery's commercial margins remain confidential.";
export const walkthroughQualification = "An optional paid visualization service. Scope, availability and pricing are confirmed separately.";
export const projectInvitationCopy = "Your selections are in place. Now let's explore what's possible, review the details and take the next step toward bringing your home to life.";
export function projectNextStepDescription(step: { title: string; description: string }) {
  if (step.title === "Product + Project Confirmation") return projectConfirmationCopy;
  if (step.title === "Project-Specific Visualization") return projectVisualizationCopy;
  return step.description;
}
