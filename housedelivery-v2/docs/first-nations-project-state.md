# First Nations Project Planner state

The First Nations Project Planner uses one versioned `PlannerState` object for the complete customer journey. The browser draft is stored under `house-delivery:first-nations-planner:v1`; the key remains stable while `PlannerState.version` controls migrations.

## Source-of-truth audit

| Project information | Canonical source | Downstream consumers |
| --- | --- | --- |
| Project identity | `state.projectId` | sticky project bar, configurator query/session, review, Opportunity Report, submitted review context |
| Community, location and initial planning target | `state.community`, `state.location`, `state.approximateHomes` | start-stage continuity; the planning target is not used as the final home total |
| Selected home models, quantities and delivery groups | `state.portfolio` | project bar, design groups, readiness, review, Opportunity Report, project-review submission |
| Final housing requirement and model mix | `getPortfolioSummary(state.portfolio, catalog)` | every output after home selection; no downstream total reads `approximateHomes` |
| Design groups and assigned quantities | `state.portfolio[].designVariations[]` | Design Project Homes, review, Opportunity Report and project-review submission |
| Exterior direction | `designVariation.culturalExteriorInterest` | configurator session, design summary, Opportunity Report and project-review submission |
| Seven-chapter package selections | `designVariation.designSelections` | saved design group, review, Opportunity Report and project-review submission |
| Saved Look Book reference | `designVariation.lookBookReference` | design stage, review, Opportunity Report and project-review submission |
| Project readiness answers | `state.readiness` | Project Readiness, review, Opportunity Report and project-review submission |
| Contact and review / LOU status | `state.contact`, `state.reviewStatus`, `state.louStatus` | final project review and persistent project status |
| Opportunity Report identity | `state.opportunityReportReference` | report, final review and submitted context |

## Persistence and transitions

- `FirstNationsProjectPlanner` restores and saves the single state object through `migratePlannerState`.
- `PlannerDesignSession` carries the project ID, portfolio line ID and design-group ID into the shared home configurator.
- Saving a Look Book writes the shared configurator return payload. `applyPlannerDesignReturn` applies it only to the matching project/design group and returns the customer to **Design Project Homes**.
- Splitting a design group redistributes the selected model quantity; the sum of group quantities cannot exceed or fall below the selected portfolio quantity.
- The final project-review request sends `formatProjectReviewContext(...)`, which serializes the same portfolio, design groups, Look Book references, readiness answers and report reference. It does not reconstruct totals from the initial planning target.

## Readiness interpretation

Readiness values are customer-sourced planning information, not pass/fail or funding eligibility. `Identified` and `Partially Known` appear under **Known Today**; `To Confirm` and `Not Yet Determined` appear under **Items to Confirm**. Unknown answers never block progress or report creation.
