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
            {record.choice === "explore" ? (
              <>
                <p className="mt-2 text-black/58">
                  Nation-led cultural design exploration requested.
                </p>
                <p className="mt-2 text-black/48">
                  {record.areas.length
                    ? `Areas to explore: ${record.areas.join(", ")}.`
                    : "Areas of interest to be developed during project review."}
                </p>
                {record.artistCollaborationRequested ? (
                  <p className="mt-2 text-black/48">
                    Local artist / community collaboration to be developed
                    during project review.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-black/48">
                Contemporary design direction selected. No additional cultural
                design exploration requested at this stage.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
