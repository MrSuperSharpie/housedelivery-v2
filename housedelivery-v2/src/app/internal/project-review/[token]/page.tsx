import Link from "next/link";
import { notFound } from "next/navigation";

import {
  firstNationsFundingCorridors,
  firstNationsPlannerCatalog,
} from "@/data/first-nations-planner";
import {
  getPlannerFundingSummary,
  getPlannerWorkforceSummary,
} from "@/lib/planner-documents";
import { getPlannerProjectForReviewToken } from "@/lib/planner-review-server";
import {
  getPortfolioSummary,
  getReadinessProfile,
} from "@/lib/project-planner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const lifecycleLabels = {
  "submitted-for-review": "Submitted for House Delivery review",
  "house-delivery-review": "House Delivery review",
  "lou-prepared": "LOU prepared for House Delivery review",
} as const;

function ReviewSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-white/14 py-9 sm:py-12">
      <div className="grid gap-7 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/38">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em]">{title}</h2>
        </div>
        <div className="lg:col-span-9">{children}</div>
      </div>
    </section>
  );
}

function Value({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <dl className="border-t border-white/12 pt-4">
      <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/36">{label}</dt>
      <dd className="mt-2 text-sm leading-6 text-white/72">{children}</dd>
    </dl>
  );
}

export default async function PlannerProjectReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { token } = await params;
  const [{ result }, project] = await Promise.all([
    searchParams,
    getPlannerProjectForReviewToken(token),
  ]);
  if (!project) notFound();

  const state = project.projectState;
  const summary = getPortfolioSummary(state.portfolio, firstNationsPlannerCatalog);
  const readiness = getReadinessProfile(state, firstNationsPlannerCatalog);
  const workforce = getPlannerWorkforceSummary(state);
  const funding = getPlannerFundingSummary(state, firstNationsFundingCorridors);
  const latestDraft = project.louDrafts.at(-1);
  const basePath = `/internal/project-review/${token}`;
  const resultMessage = result === "clarification-recorded"
    ? "Clarification hold recorded. No customer communication was sent."
    : result === "lou-prepared"
      ? `LOU Draft Revision ${latestDraft?.revision ?? ""} prepared and saved. It has not been sent to the Nation.`
      : "";

  return (
    <main data-internal-review className="min-h-screen bg-[#0b0c10] px-5 py-10 text-white sm:px-8 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-[1400px]">
        <header className="border-y border-white/16 py-8 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/38">House Delivery / Internal</p>
              <h1 className="mt-5 text-[clamp(3.1rem,7vw,7rem)] font-medium leading-[0.84] tracking-[-0.07em]">Project Review</h1>
            </div>
            <span className="border border-[#d7b774]/42 bg-[#d7b774]/8 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e2c990]">
              {project.internalReviewStatus.replaceAll("-", " ")}
            </span>
          </div>
          <div className="mt-8 grid gap-3 text-[9px] uppercase tracking-[0.14em] text-white/45 sm:grid-cols-3">
            <p>{project.id}</p>
            <p>{project.opportunityReportReference}</p>
            <p>Submitted {new Date(project.submittedAt).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</p>
          </div>
        </header>

        {resultMessage ? (
          <p role="status" className="mt-6 border border-[#d7b774]/35 bg-[#d7b774]/8 px-5 py-4 text-sm leading-6 text-[#ecd8ac]">{resultMessage}</p>
        ) : null}

        <ReviewSection eyebrow="01" title="Project">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Value label="Project ID">{project.id}</Value>
            <Value label="Opportunity Report ID">{project.opportunityReportReference}</Value>
            <Value label="Nation / Community">{project.community}</Value>
            <Value label="Location">{state.location || "To confirm"}</Value>
            <Value label="Review contact">{state.contact.firstName} {state.contact.lastName}<br />{state.contact.email}<br />{state.contact.phone || "No phone provided"}</Value>
            <Value label="Authorized representative">{state.authorizedRepresentative.name || "To confirm"}<br />{state.authorizedRepresentative.title || "Title to confirm"}</Value>
            <Value label="Council / BCR status">{state.authorizedRepresentative.councilAuthorizationStatus.replaceAll("-", " ")}</Value>
            <Value label="Submission date">{new Date(project.submittedAt).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</Value>
            <Value label="Lifecycle status">{lifecycleLabels[project.lifecycleStatus as keyof typeof lifecycleLabels] ?? project.lifecycleStatus.replaceAll("-", " ")}</Value>
          </div>
        </ReviewSection>

        <ReviewSection eyebrow="02" title="Portfolio">
          <div className="mb-7 grid gap-5 sm:grid-cols-3">
            <Value label="Total homes">{summary.totalHomes}</Value>
            <Value label="Home models">{summary.modelCount}</Value>
            <Value label="Design Groups">{project.designPackages.length}</Value>
          </div>
          <div className="border-t border-white/12">
            {summary.lines.map(({ line, model }) => (
              <div key={line.id} className="grid gap-3 border-b border-white/12 py-5 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8">
                <p className="font-medium">{model.name}</p>
                <p className="text-white/52">{line.quantity * model.homesPerSelection} {line.quantity * model.homesPerSelection === 1 ? "home" : "homes"}</p>
                <p className="text-white/52">{line.phase.replace("phase-1", "Active / First Build").replace("phase-2", "Near-Term / Next Build").replace("future", "Future Pipeline")}</p>
              </div>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection eyebrow="03" title="Design Handoff">
          <div className="grid gap-5 xl:grid-cols-2">
            {project.designPackages.map((designPackage) => (
              <article key={designPackage.variationId} className="border border-white/14 p-5 sm:p-6">
                <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-white/34">{designPackage.lookBookReference}</p>
                <h3 className="mt-3 text-xl font-medium tracking-[-0.035em]">{designPackage.designGroupName}</h3>
                <div className="mt-6 grid gap-3 text-xs leading-5 text-white/58 sm:grid-cols-2">
                  <p>Home: {designPackage.homeName}</p>
                  <p>Quantity: {designPackage.assignedQuantity}</p>
                  <p>Delivery group: {designPackage.deliveryGroup}</p>
                  <p>Exterior: {designPackage.exteriorExpression}</p>
                  <p className="sm:col-span-2">Design note: {designPackage.designNotes || "None provided"}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.15em]">
                  <Link href={designPackage.lookBookUrl} target="_blank" rel="noreferrer">View Look Book</Link>
                  <Link href={designPackage.pdfUrl} prefetch={false} target="_blank" rel="noreferrer">Download PDF</Link>
                  <Link href={designPackage.floorPlanUrl} target="_blank" rel="noreferrer">Home Plan</Link>
                </div>
              </article>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection eyebrow="04" title="Project Readiness">
          <div className="grid gap-10 lg:grid-cols-2">
            {[
              ["Known Today", readiness.filter((item) => item.ready)],
              ["Items to Confirm", readiness.filter((item) => !item.ready)],
            ].map(([title, items]) => (
              <div key={title as string}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-white/36">{title as string}</p>
                <div className="mt-4">
                  {(items as typeof readiness).map((item) => (
                    <div key={item.id} className="border-t border-white/12 py-4">
                      <div className="flex justify-between gap-5 text-sm"><p>{item.label}</p><p className="text-[8px] uppercase tracking-[0.13em] text-white/36">{item.status}</p></div>
                      <p className="mt-2 text-xs leading-5 text-white/48">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection eyebrow="05" title="Workforce / Training">
          <div className="max-w-4xl space-y-3 text-sm leading-7 text-white/62">{workforce.lines.map((line) => <p key={line}>{line}</p>)}</div>
        </ReviewSection>

        <ReviewSection eyebrow="06" title="Funding / Financing">
          <div className="grid gap-8 lg:grid-cols-2">
            <Value label="Project-reported status">{funding.projectStatus}</Value>
            <Value label="House Delivery funding-corridor review"><ul className="space-y-2">{funding.corridorReviewLines.map((line) => <li key={line}>— {line}</li>)}</ul></Value>
          </div>
        </ReviewSection>

        <ReviewSection eyebrow="07" title="Documents">
          <div className="flex flex-wrap gap-3">
            <Link href={`${basePath}/opportunity-report`} rel="noreferrer" className="border border-white/20 px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em]">View Opportunity Report</Link>
            <Link href={`${basePath}/opportunity-report/pdf?disposition=attachment`} prefetch={false} rel="noreferrer" className="border border-white/20 px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em]">Download Opportunity Report PDF</Link>
            {latestDraft ? <>
              <Link href={`${basePath}/lou/${latestDraft.revision}`} rel="noreferrer" className="border border-[#d7b774]/42 px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e2c990]">View LOU Draft R{latestDraft.revision}</Link>
              <Link href={`${basePath}/lou/${latestDraft.revision}/pdf?disposition=attachment`} prefetch={false} rel="noreferrer" className="border border-[#d7b774]/42 px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e2c990]">Download LOU Draft PDF</Link>
            </> : null}
          </div>
        </ReviewSection>

        <ReviewSection eyebrow="08" title="House Delivery Decision">
          <p className="mb-7 max-w-3xl text-sm leading-6 text-white/54">These actions update the internal project record only. They do not contact the Nation, authorize paid Design Development, release factory work or establish pricing.</p>
          <div className="grid gap-6 lg:grid-cols-2">
            <form method="post" action={`/api/internal/project-review/${token}`} className="border border-white/14 p-5 sm:p-6">
              <input type="hidden" name="action" value="clarification" />
              <label className="block">
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/42">Internal clarification note</span>
                <textarea name="reviewNote" required maxLength={3000} rows={5} className="mt-4 w-full resize-y border border-white/16 bg-transparent p-4 text-sm leading-6 text-white placeholder:text-white/28" placeholder="Record the information House Delivery needs clarified." />
              </label>
              <button type="submit" className="mt-5 min-h-12 border border-white/24 px-5 text-[9px] font-semibold uppercase tracking-[0.16em]">Return / Hold for Clarification</button>
            </form>
            <form method="post" action={`/api/internal/project-review/${token}`} className="border border-[#d7b774]/34 bg-[#d7b774]/5 p-5 sm:p-6">
              <input type="hidden" name="action" value="prepare-lou" />
              <label className="block">
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e2c990]">LOU preparation / revision note (optional)</span>
                <textarea name="reviewNote" maxLength={3000} rows={5} className="mt-4 w-full resize-y border border-[#d7b774]/28 bg-transparent p-4 text-sm leading-6 text-white placeholder:text-white/28" placeholder="Record internal drafting context or requested revision changes." />
              </label>
              <button type="submit" className="mt-5 min-h-12 bg-[#d7b774] px-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-black">{latestDraft ? `Prepare LOU Revision ${latestDraft.revision + 1}` : "Prepare LOU Draft"} →</button>
              <p className="mt-4 text-xs leading-5 text-white/42">Draft only. Not yet sent to Nation.</p>
            </form>
          </div>
          {project.reviewNotes.length ? (
            <div className="mt-8 border-t border-white/12 pt-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/36">Internal review history</p>
              <div className="mt-4 space-y-4">{project.reviewNotes.toReversed().map((note) => <div key={note.id} className="text-xs leading-5 text-white/54"><p className="uppercase tracking-[0.12em] text-white/32">{note.kind.replaceAll("-", " ")} · {new Date(note.createdAt).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</p><p className="mt-1">{note.note}</p></div>)}</div>
            </div>
          ) : null}
        </ReviewSection>
      </div>
    </main>
  );
}
