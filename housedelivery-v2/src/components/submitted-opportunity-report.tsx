import {
  firstNationsFundingCorridors,
  firstNationsPlannerCatalog,
} from "@/data/first-nations-planner";
import {
  getPlannerFundingSummary,
  getPlannerWorkforceSummary,
} from "@/lib/planner-documents";
import type { StoredPlannerProject } from "@/lib/planner-project-record";
import {
  calculatePreliminaryEstimate,
  formatPlanningValue,
  getPortfolioSummary,
  getReadinessProfile,
} from "@/lib/project-planner";

function ReportSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-black/16 py-10 print:break-inside-avoid">
      <div className="mb-7 grid gap-3 sm:grid-cols-[4rem_1fr]">
        <p className="font-mono text-[9px] text-black/35">{number}</p>
        <h2 className="text-2xl font-medium tracking-[-0.04em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function SubmittedOpportunityReport({
  project,
}: {
  project: StoredPlannerProject;
}) {
  const state = project.projectState;
  const summary = getPortfolioSummary(
    state.portfolio,
    firstNationsPlannerCatalog,
  );
  const estimate = calculatePreliminaryEstimate(
    state.portfolio,
    firstNationsPlannerCatalog,
  );
  const readiness = getReadinessProfile(
    state,
    firstNationsPlannerCatalog,
  );
  const knownToday = readiness.filter((item) => item.ready);
  const itemsToConfirm = readiness.filter((item) => !item.ready);
  const workforce = getPlannerWorkforceSummary(state);
  const funding = getPlannerFundingSummary(
    state,
    firstNationsFundingCorridors,
  );
  const servicing = readiness.find((item) => item.id === "servicing");

  return (
    <article
      data-opportunity-report-document
      data-internal-print-document
      data-planner-report
      className="bg-white px-6 text-black sm:px-10 lg:px-16 xl:px-20"
    >
      <header className="border-y border-black/18 py-9">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/45">
          House Delivery / Preliminary Opportunity Report
        </p>
        <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/42">
          Submitted project snapshot / {project.submittedAt}
        </p>
        <h1 className="mt-6 max-w-5xl text-[clamp(3.4rem,7vw,7.5rem)] font-medium leading-[0.82] tracking-[-0.075em]">
          {project.community}
        </h1>
        <div className="mt-8 grid gap-3 text-xs uppercase tracking-[0.13em] text-black/48 sm:grid-cols-4">
          <p>{state.location || "Location to confirm"}</p>
          <p>{summary.totalHomes} working {summary.totalHomes === 1 ? "home" : "homes"}</p>
          <p>Project / {project.id}</p>
          <p>{project.opportunityReportReference}</p>
        </div>
      </header>

      <ReportSection number="01" title="Opportunity">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Housing requirement", `${summary.totalHomes} ${summary.totalHomes === 1 ? "home" : "homes"}`],
            ["Model mix", `${summary.modelCount} ${summary.modelCount === 1 ? "model type" : "model types"}`],
            ["Sites", state.sitePattern.replaceAll("-", " ")],
            ["Horizon", state.deliveryHorizon.replaceAll("-", " ")],
          ].map(([label, value]) => (
            <dl key={label} className="border-t border-black/16 pt-4">
              <dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">{label}</dt>
              <dd className="mt-3 text-xl font-medium tracking-[-0.03em]">{value}</dd>
            </dl>
          ))}
        </div>
      </ReportSection>

      <ReportSection number="02" title="Portfolio and phases">
        <div className="border-t border-black/16">
          {summary.lines.map(({ line, model }) => (
            <div key={line.id} className="grid grid-cols-[1fr_auto] gap-5 border-b border-black/16 py-4 text-sm">
              <div>
                <p className="font-medium">{model.name}</p>
                <p className="mt-1 text-xs text-black/45">Custom Home</p>
              </div>
              <p className="text-right">
                {line.quantity * model.homesPerSelection} {line.quantity * model.homesPerSelection === 1 ? "home" : "homes"}
                <br />
                <span className="text-xs text-black/45">{line.phase.replace("phase-1", "Active / First Build").replace("phase-2", "Near-Term / Next Build").replace("future", "Future Pipeline")}</span>
              </p>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection number="03" title="Preliminary feasibility">
        <div className="grid border-l border-t border-black/16 sm:grid-cols-3">
          {[
            ["Low", estimate.low],
            ["Base planning case", estimate.base],
            ["High", estimate.high],
          ].map(([label, value]) => (
            <dl key={label as string} className="border-b border-r border-black/16 p-5">
              <dt className="text-[8px] uppercase tracking-[0.16em] text-black/42">{label}</dt>
              <dd className="mt-8 text-xl font-medium leading-tight">{formatPlanningValue(value as number | null)}</dd>
            </dl>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-black/52">
          Preliminary feasibility only—not a quotation. Potential funding has not been deducted. Design direction does not change pricing without a controlled commercial delta.
        </p>
      </ReportSection>

      <ReportSection number="04" title="Design direction">
        <p className="mb-6 max-w-4xl text-sm leading-6 text-black/58">
          {project.designPackages.length} completed {project.designPackages.length === 1 ? "Design Group" : "Design Groups"}. The completed Look Book establishes the preliminary design direction for each Design Group. Following House Delivery review and the appropriate project authorization, these selections can be used for factory design development, virtual walkthrough preparation and project-specific specification review.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {project.designPackages.map((designPackage) => (
            <p key={designPackage.variationId} className="border-t border-black/16 pt-3 text-sm">
              <span className="text-black/42">{designPackage.designGroupName}</span>
              <br />
              Assigned to {designPackage.assignedQuantity} {designPackage.assignedQuantity === 1 ? "home" : "homes"} · {designPackage.exteriorExpression} · Look Book {designPackage.lookBookReference}
            </p>
          ))}
        </div>
        <p className="mt-7 max-w-4xl border-t border-black/16 pt-5 text-xs leading-5 text-black/52">
          Factory design-development and virtual walkthrough services are a separate paid next-stage service and are not included simply by completing this Opportunity Report. No fee is due unless it is separately disclosed and authorized.
        </p>
      </ReportSection>

      <ReportSection number="05" title="Major range drivers">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Site and servicing", servicing?.detail ?? "To confirm"],
            ["Access and logistics", state.location || "Unknown / to confirm"],
            ["Timing and phasing", state.deliveryHorizon.replaceAll("-", " ")],
          ].map(([label, value]) => (
            <p key={label} className="border-t border-black/16 pt-3 text-sm">
              <span className="text-black/42">{label}</span><br />{value}
            </p>
          ))}
        </div>
      </ReportSection>

      <ReportSection number="06" title="Project readiness">
        <div className="grid gap-10 lg:grid-cols-2">
          {[
            ["Known Today", knownToday],
            ["Items to Confirm", itemsToConfirm],
          ].map(([title, items]) => (
            <div key={title as string}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/44">{title as string}</p>
              <div className="mt-4">
                {(items as typeof readiness).map((item) => (
                  <div key={item.id} className="border-t border-black/16 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium">{item.label}</p>
                      <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-black/42">{item.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-black/48">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection number="07" title="Community workforce & capacity">
        <div className="space-y-3 text-sm leading-6 text-black/60">
          {workforce.lines.map((line) => <p key={line}>{line}</p>)}
        </div>
      </ReportSection>

      <ReportSection number="08" title="Funding and financing">
        <p className="text-sm font-medium">Project-reported status</p>
        <p className="mt-2 text-sm text-black/60">{funding.projectStatus}</p>
        <p className="mt-6 text-sm font-medium">House Delivery funding-corridor review</p>
        <ul className="mt-2 space-y-2 text-sm text-black/60">
          {funding.corridorReviewLines.map((line) => <li key={line}>— {line}</li>)}
        </ul>
        <p className="mt-5 max-w-3xl text-xs leading-5 text-black/50">
          House Delivery may assist with potential funding and financing discussions during project review. No program eligibility, funding approval or lender approval is implied.
        </p>
      </ReportSection>

      <ReportSection number="09" title="Assumptions, exclusions and missing information">
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            ["Assumptions", estimate.assumptions],
            ["Exclusions", estimate.exclusions],
            ["Missing information", itemsToConfirm.map((item) => item.label)],
          ].map(([title, items]) => (
            <div key={title as string}>
              <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/42">{title as string}</p>
              <ul className="mt-4 space-y-2 text-xs leading-5 text-black/55">
                {(items as readonly string[]).map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </ReportSection>

      <footer className="mt-14 bg-[#0b0c10] p-6 text-white sm:p-9">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">Next pathway</p>
        <p className="mt-5 text-xl font-medium leading-8 tracking-[-0.025em]">
          House Delivery Review → LOU → Separate Design Development Authorization → Factory Virtual Walkthrough &amp; Specification Development → Final / Refined Project Pricing → Definitive Agreement
        </p>
        <p className="mt-7 max-w-4xl text-xs leading-5 text-white/48">
          This preliminary report is for early opportunity planning only. It is not a quotation, funding decision, technical approval, permit opinion or commitment to deliver.
        </p>
      </footer>
    </article>
  );
}
