const certifications = [
  {
    mark: "ISO",
    name: "ISO 9001:2015",
    discipline: "Quality management",
  },
  {
    mark: "ISO",
    name: "ISO 14001",
    discipline: "Environmental management",
  },
  {
    mark: "ISO",
    name: "ISO 45001:2018",
    discipline: "Occupational health & safety",
  },
  {
    mark: "EN",
    name: "EN 1090",
    discipline: "Structural steel conformity",
  },
  {
    mark: "ICC-ES",
    name: "ICC Evaluation Service",
    discipline: "Technical evaluation",
  },
] as const;

export function TrustBanner() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="border-b border-[#1f2833] bg-[#0e1014] px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-7 border-b border-white/12 pb-9 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="eyebrow">Trust &amp; certifications</p>
            <h2
              id="trust-heading"
              className="mt-5 text-3xl font-medium tracking-[-0.045em] sm:text-4xl"
            >
              Trusted Standards.{" "}
              <span className="text-white/38">Certified Quality.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[10px] uppercase leading-5 tracking-[0.17em] text-white/30 sm:text-right">
            Documented systems for quality, safety, environmental performance,
            and structural conformity.
          </p>
        </div>

        <div className="grid border-l border-white/12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {certifications.map((certification) => (
            <article
              key={certification.name}
              className="group flex min-h-44 flex-col justify-between border-b border-r border-white/12 p-5 transition-colors hover:bg-white/[0.035] sm:p-6"
            >
              <span className="text-2xl font-medium tracking-[-0.055em] text-white/28 transition-colors group-hover:text-white/60">
                {certification.mark}
              </span>
              <div className="mt-10">
                <h3 className="text-sm font-medium leading-5 text-white/72">
                  {certification.name}
                </h3>
                <p className="mt-2 text-[8px] font-semibold uppercase leading-4 tracking-[0.16em] text-white/28">
                  {certification.discipline}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
