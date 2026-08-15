import type { HomeDesignDirection } from "@/data/home-design-collections";
import type { SolaceKitchenCabinetryOption } from "@/data/solace-configuration";

type MySolaceSummaryProps = {
  designDirection: HomeDesignDirection;
  kitchenCabinetry: SolaceKitchenCabinetryOption;
};

export function MySolaceSummary({
  designDirection,
  kitchenCabinetry,
}: MySolaceSummaryProps) {
  const levelLabel =
    kitchenCabinetry.level === "premium"
      ? "Premium — Included"
      : "Signature — Upgrade";

  return (
    <section
      id="my-solace"
      aria-labelledby="my-solace-heading"
      className="scroll-mt-20 border-b border-white/10 bg-[#e7e3d8] px-5 py-24 text-[#111216] sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px]">
        <p className="sr-only" aria-live="polite">
          My Solace updated: {designDirection.name} Design Direction with{" "}
          {kitchenCabinetry.name} cabinetry, {levelLabel}.
        </p>
        <div className="grid gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-24">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
              Live configuration / Prototype
            </p>
            <h2
              id="my-solace-heading"
              className="mt-7 text-[clamp(4rem,8vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.076em]"
            >
              My
              <br />
              <span className="text-black/32">Solace.</span>
            </h2>
          </div>

          <div>
            <p className="max-w-2xl text-base leading-8 text-black/58">
              Your Design Direction and controlled category choices remain
              separate, creating one clear configuration that can grow as more
              Solace categories are added.
            </p>
            <dl className="mt-10 grid border-l border-t border-black/15 sm:grid-cols-2">
              <div className="flex min-h-36 flex-col justify-between border-b border-r border-black/15 p-5 sm:min-h-44 sm:p-6">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/38">
                  Residence
                </dt>
                <dd className="mt-8 text-2xl font-medium tracking-[-0.04em] text-black/78 sm:text-3xl">
                  Solace
                </dd>
              </div>
              <div className="flex min-h-36 flex-col justify-between border-b border-r border-black/15 p-5 sm:min-h-44 sm:p-6">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/38">
                  Design Direction
                </dt>
                <dd className="mt-8 text-2xl font-medium tracking-[-0.04em] text-black/78 sm:text-3xl">
                  {designDirection.name}
                </dd>
              </div>
              <div className="flex min-h-36 flex-col justify-between border-b border-r border-black/15 p-5 sm:min-h-44 sm:p-6">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/38">
                  Kitchen Cabinetry
                </dt>
                <dd className="mt-8 text-2xl font-medium tracking-[-0.04em] text-black/78 sm:text-3xl">
                  {kitchenCabinetry.name}
                </dd>
              </div>
              <div className="flex min-h-36 flex-col justify-between border-b border-r border-black/15 p-5 sm:min-h-44 sm:p-6">
                <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/38">
                  Cabinetry Level
                </dt>
                <dd className="mt-8 text-lg font-medium tracking-[-0.025em] text-black/70 sm:text-2xl">
                  {levelLabel}
                </dd>
              </div>
            </dl>
            <p className="mt-6 max-w-2xl text-xs leading-6 text-black/45">
              This prototype is not a final specification or order. House
              Delivery confirms products, finishes, availability and technical
              suitability during project review.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
