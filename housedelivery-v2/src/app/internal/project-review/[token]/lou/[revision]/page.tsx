import Link from "next/link";
import { notFound } from "next/navigation";

import { PlannerLouDocument } from "@/components/planner-lou-document";
import { getPlannerProjectForReviewToken } from "@/lib/planner-review-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlannerLouDraftPage({
  params,
}: {
  params: Promise<{ token: string; revision: string }>;
}) {
  const { token, revision: rawRevision } = await params;
  const revision = Number(rawRevision);
  if (!Number.isSafeInteger(revision) || revision < 1) notFound();
  const project = await getPlannerProjectForReviewToken(token);
  const draft = project?.louDrafts.find((item) => item.revision === revision);
  if (!project || !draft) notFound();
  const basePath = `/internal/project-review/${token}`;

  return (
    <>
      <nav className="planner-screen-only border-b border-white/14 bg-[#0b0c10] px-5 py-4 text-white sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <Link href={basePath} rel="noreferrer" className="text-[9px] font-semibold uppercase tracking-[0.16em]">← Project Review</Link>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#e2c990]">Not yet sent to Nation</span>
            <Link href={`${basePath}/lou/${revision}/pdf?disposition=attachment`} rel="noreferrer" className="border border-white/22 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em]">Download PDF</Link>
          </div>
        </div>
      </nav>
      <main className="internal-document-shell bg-white py-8 sm:py-12">
        <PlannerLouDocument draft={draft} token={token} />
      </main>
    </>
  );
}
