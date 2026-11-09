import type { CulturalDesignReportRecord } from "@/lib/project-planner";

export function CulturalDesignReport({
  records,
}: {
  records: readonly CulturalDesignReportRecord[];
}) {
  if (!records.length) return null;

  return (
    <div
      data-opportunity-report-cultural-design
      className="mt-9 border-t border-black/20 pt-6"
    >
      <h4 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/48">
        Cultural Design Direction
      </h4>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        {records.map((record) => (
          <div
            key={record.id}
            className="border-t border-black/16 pt-4 text-sm leading-6"
          >
            <p className="font-medium">{record.designName}</p>
            <p className="mt-2 text-black/58">
              Indigenous Inspiration selected. Exterior cultural
              expression to be developed with the Nation during project review.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
