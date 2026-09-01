import Link from "next/link";

import type { PlannerLouDraft } from "@/lib/planner-project-record";

function LouSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-black/16 py-8 print:break-inside-avoid">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/48">{title}</h2>
      <div className="mt-5 text-sm leading-7 text-black/72">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => <li key={item}>— {item}</li>)}
    </ul>
  );
}

export function PlannerLouDocument({
  draft,
  token,
}: {
  draft: PlannerLouDraft;
  token: string;
}) {
  const document = draft.document;
  const reviewBase = `/internal/project-review/${token}`;

  return (
    <article
      data-lou-document
      data-internal-print-document
      className="mx-auto max-w-5xl bg-white px-6 py-10 text-black sm:px-10 lg:px-16 lg:py-16"
    >
      <header className="border-y border-black/20 py-8">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-black/46">House Delivery Inc.</p>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b3c2d]">Draft — House Delivery Review Required</p>
        <h1 className="mt-5 max-w-4xl text-[clamp(2.8rem,7vw,6rem)] font-medium leading-[0.86] tracking-[-0.065em]">
          Project Development<br />Letter of Understanding
        </h1>
        <div className="mt-8 grid gap-3 text-[10px] uppercase tracking-[0.14em] text-black/52 sm:grid-cols-3">
          <p>LOU Draft Revision {draft.revision}</p>
          <p>Created {new Date(draft.createdAt).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}</p>
          <p>Not yet sent to Nation</p>
        </div>
      </header>

      <LouSection title="Project">
        <div className="grid gap-5 sm:grid-cols-2">
          <p><span className="text-black/42">Project ID</span><br />{document.project.id}</p>
          <p><span className="text-black/42">Opportunity Report ID</span><br />{document.project.opportunityReportReference}</p>
          <p><span className="text-black/42">Nation / Community</span><br />{document.project.community}</p>
          <p><span className="text-black/42">Project location</span><br />{document.project.location}</p>
        </div>
      </LouSection>

      <LouSection title="Parties">
        <p>{document.parties[0]}</p>
        <p className="my-3 text-black/42">and</p>
        <p>{document.parties[1]}</p>
      </LouSection>

      <LouSection title="Authorized Representative">
        <div className="grid gap-5 sm:grid-cols-3">
          <p><span className="text-black/42">Name</span><br />{document.authorizedRepresentative.name}</p>
          <p><span className="text-black/42">Title</span><br />{document.authorizedRepresentative.title}</p>
          <p><span className="text-black/42">Council / BCR status</span><br />{document.authorizedRepresentative.councilAuthorizationStatus}</p>
        </div>
      </LouSection>

      <LouSection title="Purpose"><p>{document.purpose}</p></LouSection>
      <LouSection title="Preliminary Project Basis"><BulletList items={document.preliminaryProjectBasis} /></LouSection>

      <LouSection title="Design Direction">
        <p className="mb-6">The completed Look Books are the detailed preliminary design records for the following Design Groups.</p>
        <div className="space-y-6">
          {document.designDirections.map((design) => (
            <section key={design.name} className="border-t border-black/16 pt-5">
              <h3 className="text-lg font-medium tracking-[-0.025em]">{design.name}</h3>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <p>Home: {design.home}</p><p>Assigned quantity: {design.quantity}</p>
                <p>Delivery group: {design.deliveryGroup}</p><p>Exterior expression: {design.exteriorExpression}</p>
                <p>Look Book: {design.lookBookReference}</p><p>Design note: {design.designNotes}</p>
              </div>
            </section>
          ))}
        </div>
      </LouSection>

      <LouSection title="Project Readiness — Known Today"><BulletList items={document.knownToday} /></LouSection>
      <LouSection title="Project Readiness — Items to Confirm"><BulletList items={document.itemsToConfirm} /></LouSection>
      <LouSection title="Community Workforce & Capacity"><div className="space-y-3">{document.workforce.map((line) => <p key={line}>{line}</p>)}</div></LouSection>

      <LouSection title="Funding / Financing">
        <p><span className="text-black/42">Project-reported status</span><br />{document.funding.projectStatus}</p>
        <p className="mt-5 text-black/42">House Delivery funding-corridor review</p>
        <BulletList items={document.funding.corridorReview} />
        <p className="mt-5">No funding, financing, program eligibility or lender approval is represented by this draft.</p>
      </LouSection>

      <LouSection title="House Delivery Next Steps"><BulletList items={document.houseDeliveryNextSteps} /></LouSection>
      <LouSection title="Nation / Community Next Steps"><BulletList items={document.communityNextSteps} /></LouSection>
      <LouSection title="Separate Paid Design Development"><p>{document.paidDesignDevelopmentClause}</p></LouSection>
      <LouSection title="Final / Refined Project Pricing"><p>{document.finalPricingClause}</p></LouSection>

      <LouSection title="Schedule A — Preliminary Opportunity Report">
        <p>Submitted Opportunity Report {document.project.opportunityReportReference} is incorporated by reference as a preliminary project record.</p>
        <div className="planner-screen-only mt-5 flex flex-wrap gap-4">
          <Link href={`${reviewBase}/opportunity-report`} rel="noreferrer" className="text-[9px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4">View</Link>
          <Link href={`${reviewBase}/opportunity-report/pdf?disposition=attachment`} rel="noreferrer" className="text-[9px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4">Download PDF</Link>
        </div>
      </LouSection>

      <LouSection title="Schedule B — Preliminary Design Directions">
        <p>The Design Groups below form Schedule B. The completed Look Books remain the detailed design records.</p>
        <div className="mt-6 space-y-5">
          {document.designDirections.map((design) => (
            <div key={design.name} className="border-t border-black/16 pt-4">
              <p className="font-medium">{design.name}</p>
              <p className="mt-1 text-xs text-black/56">{design.home} · {design.quantity} {design.quantity === 1 ? "home" : "homes"} · {design.deliveryGroup} · {design.exteriorExpression} · Look Book {design.lookBookReference}</p>
              <p className="mt-2 text-xs text-black/56">{design.designNotes}</p>
              <div className="planner-screen-only mt-3 flex flex-wrap gap-4">
                <Link href={design.lookBookUrl} target="_blank" rel="noreferrer" className="text-[9px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4">View Look Book</Link>
                <Link href={design.pdfUrl} target="_blank" rel="noreferrer" className="text-[9px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4">Look Book PDF</Link>
              </div>
            </div>
          ))}
        </div>
      </LouSection>

      <footer className="mt-10 border-t border-black/22 pt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b3c2d]">Draft — House Delivery Review Required</p>
        <p className="mt-2 text-xs text-black/52">Not yet sent to Nation. Human and appropriate legal review required before Production use.</p>
      </footer>
    </article>
  );
}
