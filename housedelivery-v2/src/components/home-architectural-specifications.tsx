import type { HomeModel } from "@/data/models";

const technicalOrder = ["Structure", "Footprint", "Accommodation", "Main level", "Upper level"];

export function HomeArchitecturalSpecifications({ model, specifications }: { model: HomeModel; specifications: readonly { label: string; value: string }[] }) {
  return (
    <div data-home-architectural-specifications className="mt-14 lg:mt-20">
      <dl className="grid grid-cols-[1.45fr_1fr_1fr] border-y border-black/25 py-7 sm:py-10">
        {[[model.squareFeet.toLocaleString("en-CA"), "Square feet"], [String(model.bedrooms).padStart(2, "0"), "Bedrooms"], [String(model.storeys).padStart(2, "0"), "Storeys"]].map(([value, label]) => (
          <div key={label} className="border-r border-black/20 px-4 first:pl-0 last:border-r-0 sm:px-8">
            <dd className="text-[clamp(2.4rem,7.2vw,7.5rem)] font-light leading-none tracking-[-0.065em]">{value}</dd>
            <dt className="mt-4 text-[8px] font-semibold uppercase tracking-[0.14em] text-black/60 sm:text-[10px]">{label}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-8 grid gap-x-16 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="pb-8 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#756449]">Architectural information</p>
          <p className="mt-5 max-w-sm text-sm leading-7 text-black/65">Site engineering required.</p>
          <p className="text-sm leading-7 text-black/65">{model.garageLabel ?? (model.garageSpaces === null ? "Garage configuration varies" : model.garageSpaces === 0 ? "No garage" : model.garageSpaces + "-car garage")}</p>
        </div>
        <dl>
          {specifications.filter((item) => item.label !== "Total area").sort((a, b) => technicalOrder.indexOf(a.label) - technicalOrder.indexOf(b.label)).map((item) => (
            <div key={item.label} className="grid grid-cols-[0.8fr_1.2fr] gap-5 border-b border-black/15 py-4 text-sm">
              <dt className="text-black/55">{item.label}</dt>
              <dd className="font-medium text-black/85">{item.label === "Accommodation" && model.bathrooms === null ? model.bedrooms + " bedrooms · Baths on request" : item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
