"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { BudgetHomeGallery } from "@/components/budget-home-gallery";
import { ReservationForm } from "@/components/reservation-form";
import { budgetPlannerCatalog } from "@/data/budget-planner-catalog";
import { inquiryModels } from "@/data/inquiry-models";
import { pricingGuide } from "@/data/pricing";
import {
  finishPreferences, formatHomeBudgetProject, getDeliveredProjectPrice,
  maximumBudgetLines, maximumHomeQuantity, projectRequestLabels,
  type BudgetHomeLine, type FinishPreference, type HomeBudgetProject, type ProjectRequest,
} from "@/lib/home-budget-planner";

const inputClass = "mt-3 min-h-12 w-full border border-white/25 bg-[#101217] px-4 py-3 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const buttonClass = "inline-flex min-h-12 items-center justify-center border border-white/30 px-5 py-3 text-sm transition-colors hover:bg-white hover:text-black disabled:opacity-40";
const families = [...new Set(budgetPlannerCatalog.map((home) => home.family))];
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

export function HomeBudgetPlanner() {
  const query = useSearchParams();
  // A model link starts its own project. No contact or Look Book gate.
  return <BudgetPlanner key={query.toString()} modelId={query.get("model") ?? ""} selections={query.get("selections")?.slice(0, 4000) ?? ""} />;
}

function BudgetPlanner({ modelId, selections }: { modelId: string; selections: string }) {
  const initialHome = budgetPlannerCatalog.find((home) => home.id === modelId) ?? budgetPlannerCatalog[0];
  const initialSelections = initialHome.id === modelId ? selections : "";
  const [project, setProject] = useState<HomeBudgetProject>({
    version: 1,
    homes: [{ id: "home-1", modelId: initialHome.id, quantity: 1, finish: initialSelections ? "undecided" : "essential", selections: initialSelections }],
    location: "", requests: [], details: "",
  });
  const [showInquiry, setShowInquiry] = useState(false);
  const [notice, setNotice] = useState("");
  const nextId = useRef(2);
  const inquiryRef = useRef<HTMLDivElement>(null);
  const price = getDeliveredProjectPrice(project);

  function updateHome(id: string, update: Partial<BudgetHomeLine>) {
    setProject((current) => ({ ...current, homes: current.homes.map((line) => line.id === id ? { ...line, ...update } : line) }));
  }

  function saveSummary() {
    const file = new Blob([formatHomeBudgetProject(project)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url; link.download = "House-Delivery-budget-summary.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Summary saved. You can send your project directly using the enquiry form below.");
  }

  return (
    <section id="budget-planner" aria-labelledby="budget-planner-heading" className="mt-20 scroll-mt-28 border-t border-white/15 pt-10">
      <p className="eyebrow">Your home / Your budget</p>
      <h2 id="budget-planner-heading" className="mt-5 text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Home budget planner</h2>
      <p className="mt-6 max-w-3xl text-base leading-7 text-white/65">Choose a home and the inclusions you’re interested in. Add another home for different selections, or increase the quantity for matching packages. Browse freely; the Look Book is optional.</p>

      <div id="budget-homes" className="mt-10 max-w-4xl space-y-8 scroll-mt-28">
        {project.homes.map((line, index) => {
          const home = budgetPlannerCatalog.find((item) => item.id === line.modelId)!;
          const delivered = price.lines[index];
          return (
            <article key={line.id} id={`budget-${line.id}`} data-budget-home={line.id} className="scroll-mt-28 border border-white/15 bg-[#0e1014] p-5 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-2xl font-medium tracking-[-0.035em]">Home {index + 1}</h3>
                {project.homes.length > 1 ? <button type="button" aria-label={`Remove home ${index + 1}`} onClick={() => setProject((current) => ({ ...current, homes: current.homes.filter((item) => item.id !== line.id) }))} className="min-h-11 text-sm underline underline-offset-4">Remove</button> : null}
              </div>
              <label className="mt-5 block text-sm">
                Home design
                <select aria-label={`Home ${index + 1} design`} value={line.modelId} onChange={(event) => updateHome(line.id, { modelId: event.target.value, selections: "", finish: "essential" })} className={inputClass}>
                  {families.map((family) => <optgroup key={family} label={family}>{budgetPlannerCatalog.filter((item) => item.family === family).map((item) => <option key={item.id} value={item.id}>{item.name}{item.area ? ` — ${item.area}` : ""}</option>)}</optgroup>)}
                </select>
              </label>
              <BudgetHomeGallery key={home.id} home={home} />
              <p className="mt-2 text-xs leading-6 text-white/60">Cultural artwork, carvings and custom features shown are optional and quoted separately. Images do not define package inclusions.</p>
              <Link href={home.href} target="_blank" rel="noopener" className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Explore this home and available Look Book (opens a new tab)</Link>
              <label className="mt-6 block text-sm">
                Quantity — matching packages
                <input aria-label={`Home ${index + 1} quantity`} type="number" min={1} max={maximumHomeQuantity} step={1} value={line.quantity} onChange={(event) => {
                  const quantity = event.target.valueAsNumber;
                  if (Number.isInteger(quantity) && quantity >= 1 && quantity <= maximumHomeQuantity) updateHome(line.id, { quantity });
                }} className={`${inputClass} max-w-36`} />
              </label>
              {line.modelId.startsWith("catalog:") ? <p className="mt-2 text-xs leading-6 text-white/60">Quantity counts complete designs/buildings. A multiplex selection includes the homes in that design.</p> : null}
              <fieldset className="mt-7">
                <legend className="text-sm">Inclusions and finishes for home {index + 1}</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {Object.entries(finishPreferences).map(([value, label]) => (
                    <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 border border-white/20 px-4 py-3 text-sm has-checked:border-[#d8c4a5] has-checked:bg-white/5">
                      <input type="radio" name={`finish-${line.id}`} value={value} checked={line.finish === value} onChange={() => updateHome(line.id, { finish: value as FinishPreference })} className="size-4 shrink-0 accent-[#d8c4a5]" />{label}
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-6 text-white/65">Essential is included in the base package. Premium or Signature is an alternative upgrade above Essential, with the exact inclusions confirmed in your quote.</p>
              </fieldset>
              <label className="mt-6 block text-sm">
                Design selections or requests for this home (optional)
                <textarea aria-label={`Home ${index + 1} selections`} rows={3} maxLength={4000} value={line.selections} onChange={(event) => updateHome(line.id, { selections: event.target.value })} placeholder="Keep or describe room selections, finishes or a Look Book reference…" className={inputClass} />
              </label>
              <p className="mt-2 text-xs leading-6 text-white/60">Existing room selections remain requests for review. Choosing a finish preference here does not replace them or add a second charge for included products.</p>
              <dl className="mt-7 space-y-4 border-t border-white/15 pt-6 text-sm">
                <div><dt className="text-white/60">Base Home Package — Essential included</dt><dd className="mt-2">{delivered.price ? "Included in the approved package below" : "Request package pricing"}</dd></div>
                {line.finish === "premium" || line.finish === "signature" ? <div><dt className="text-white/60">{finishPreferences[line.finish]}</dt><dd className="mt-2">{delivered.price ? "Included in the approved package below" : "Upgrade quote required"}</dd></div> : null}
                <div><dt className="text-white/60">Delivered Home Package × {line.quantity}</dt><dd className="mt-2 text-xl font-medium">{delivered.amount === null ? "Request package pricing" : `${cad.format(delivered.amount)} CAD`}</dd></div>
              </dl>
              {delivered.price ? <p className="mt-3 text-xs leading-6 text-white/65">Specification: {delivered.price.specification}. Destination: {delivered.price.delivery!.destination}. Access: {delivered.price.delivery!.accessAssumptions}. Approved {delivered.price.approvedOn}; valid through {delivered.price.validUntil}. Applicable sales taxes extra.</p> : null}
            </article>
          );
        })}
        <button type="button" disabled={project.homes.length >= maximumBudgetLines} onClick={() => {
          const id = `home-${nextId.current++}`;
          setProject((current) => ({ ...current, homes: [...current.homes, { id, modelId: initialHome.id, quantity: 1, finish: "essential", selections: "" }] }));
        }} className={buttonClass}>Add another home</button>

        <label className="block text-sm">Delivery location
          <input name="budgetLocation" maxLength={160} value={project.location} onChange={(event) => setProject((current) => ({ ...current, location: event.target.value }))} placeholder="Site address or city, province and postal code" autoComplete="street-address" className={inputClass} />
        </label>
        <p className="text-sm leading-7 text-white/65">Delivery scope and site access require review. Entering your location does not calculate freight or confirm a delivered price.</p>

        <details className="border-y border-white/15 py-5">
          <summary className="min-h-11 cursor-pointer text-lg font-medium">Project details (optional)</summary>
          <p className="mt-5 text-sm leading-7 text-white/75">Need to adapt this home or explore another design? Tell us what you have in mind. Design changes are reviewed and quoted separately.</p>
          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Requests for separate review and quote</legend>
            {Object.entries(projectRequestLabels).map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={project.requests.includes(key as ProjectRequest)} onChange={(event) => setProject((current) => ({ ...current, requests: event.target.checked ? [...current.requests, key as ProjectRequest] : current.requests.filter((item) => item !== key) }))} className="size-4 accent-[#d8c4a5]" />{label}</label>)}
          </fieldset>
          <label className="mt-5 block text-sm">Tell us what you have in mind
            <textarea rows={4} maxLength={4000} value={project.details} onChange={(event) => setProject((current) => ({ ...current, details: event.target.value }))} className={inputClass} />
          </label>
          <p className="mt-3 text-xs leading-6 text-white/65">These requests are unpriced and subject to review. Technical scope and feasibility will be confirmed separately.</p>
        </details>

        <section aria-labelledby="budget-summary-heading" className="border border-white/20 p-5 sm:p-8">
          <h3 id="budget-summary-heading" className="text-3xl font-medium tracking-[-0.045em]">Your project summary</h3>
          <ul className="mt-6 space-y-5">
            {project.homes.map((line, index) => <li key={line.id} className="border-b border-white/15 pb-5 text-sm leading-7">
              <p className="font-medium">{budgetPlannerCatalog.find((home) => home.id === line.modelId)!.name} × {line.quantity}</p>
              <p className="text-white/65">{finishPreferences[line.finish]}</p>
              {line.selections ? <p className="whitespace-pre-wrap break-words text-white/65">{line.selections}</p> : null}
              <a href={`#budget-${line.id}`} aria-label={`Edit home ${index + 1}`} className="inline-flex min-h-11 items-center underline underline-offset-4">Edit selection</a>
            </li>)}
          </ul>
          <p className="mt-5 break-words text-sm leading-7">Delivery location: {project.location || "To be confirmed"}</p>
          {project.requests.length ? <p className="mt-3 text-sm leading-7">Requests for review: {project.requests.map((key) => projectRequestLabels[key]).join("; ")}</p> : null}
          {project.details ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{project.details}</p> : null}
          <dl className="mt-6 space-y-6 border-t border-white/15 pt-6">
            <div><dt className="text-sm text-white/65">Delivered Home Package{project.homes.length > 1 ? "s" : ""}</dt><dd className="mt-3 text-2xl font-medium">{price.amount === null ? "Request package pricing" : `${cad.format(price.amount)} CAD`}</dd></div>
            <div><dt className="text-sm text-white/65">Assembly and local completion</dt><dd className="mt-3 text-lg">Local builder quote required</dd></div>
          </dl>
          <p className="mt-6 text-sm leading-7 text-white/65">{pricingGuide.disclosure}</p>
          <p className="mt-3 text-xs leading-6 text-white/65">This summary is a request for a quote. It is not a completed-home total. Open selections and requests require review before a package price can be confirmed.</p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button type="button" onClick={() => { setShowInquiry(true); setTimeout(() => inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100); }} className="inline-flex min-h-12 items-center border border-white bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b0c10]">Get a site-specific budget</button>
            <button type="button" onClick={saveSummary} className="min-h-11 text-sm underline underline-offset-4">Save summary (optional)</button>
          </div>
          <p role="status" className="mt-3 text-xs leading-6 text-white/65">{notice}</p>
        </section>
      </div>
      <div ref={inquiryRef} className="mt-10 scroll-mt-24">
        {showInquiry ? <ReservationForm models={inquiryModels} budgetProject={project} onBudgetLocationChange={(location) => setProject((current) => ({ ...current, location }))} /> : null}
      </div>
    </section>
  );
}
