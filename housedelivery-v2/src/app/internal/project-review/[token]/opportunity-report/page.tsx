import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmittedOpportunityReport } from "@/components/submitted-opportunity-report";
import { getPlannerProjectForReviewToken } from "@/lib/planner-review-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubmittedOpportunityReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = await getPlannerProjectForReviewToken(token);
  if (!project) notFound();
  const basePath = `/internal/project-review/${token}`;

  return (
    <>
      <nav className="planner-screen-only border-b border-white/14 bg-[#0b0c10] px-5 py-4 text-white sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <Link href={basePath} rel="noreferrer" className="text-[9px] font-semibold uppercase tracking-[0.16em]">← Project Review</Link>
          <Link href={`${basePath}/opportunity-report/pdf?disposition=attachment`} prefetch={false} rel="noreferrer" className="border border-white/22 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em]">Download PDF</Link>
        </div>
      </nav>
      <main className="internal-document-shell mx-auto max-w-5xl bg-white py-8 sm:py-12">
        <SubmittedOpportunityReport project={project} />
      </main>
    </>
  );
}
