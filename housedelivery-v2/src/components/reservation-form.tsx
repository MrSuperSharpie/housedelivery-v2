"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

import { HeadlineReveal } from "@/components/headline-reveal";
import type { InquiryModel } from "@/data/inquiry-models";
import { getBudgetInquiryNotes } from "@/lib/budget-inquiry";
import type { HomeBudgetProject } from "@/lib/home-budget-planner";

type ReservationFormProps = {
  models: readonly InquiryModel[];
  defaultModel?: string;
  defaultNotes?: string;
  budgetProject?: HomeBudgetProject;
  onBudgetLocationChange?: (location: string) => void;
};

type InquiryFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  model: string;
  location: string;
  timeline: string;
  notes: string;
  company: string;
};

function readFormValue(formData: FormData, name: keyof InquiryFormValues) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isAcceptedInquiryResponse(value: unknown): value is { accepted: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    "accepted" in value &&
    value.accepted === true
  );
}

export function ReservationFormFromQuery({ models }: ReservationFormProps) {
  const searchParams = useSearchParams();
  const query = new URLSearchParams(searchParams.toString());
  const defaultModel = models.find((model) => model.slug === query.get("model"))?.slug ?? "";
  const defaultNotes = getBudgetInquiryNotes(query);

  return <ReservationForm key={`${defaultModel}:${defaultNotes}`} models={models} defaultModel={defaultModel} defaultNotes={defaultNotes} />;
}

export function ReservationForm({ models, defaultModel = "", defaultNotes = "", budgetProject, onBudgetLocationChange }: ReservationFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submittedBudget, setSubmittedBudget] = useState<string | null>(null);
  const budgetUnchanged = !budgetProject || submittedBudget === JSON.stringify(budgetProject);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const submissionInFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionInFlight.current) {
      return;
    }

    submissionInFlight.current = true;
    const formData = new FormData(event.currentTarget);
    const inquiry: InquiryFormValues = {
      firstName: readFormValue(formData, "firstName"),
      lastName: readFormValue(formData, "lastName"),
      email: readFormValue(formData, "email"),
      phone: readFormValue(formData, "phone"),
      model: budgetProject?.homes[0].modelId ?? readFormValue(formData, "model"),
      location: readFormValue(formData, "location"),
      timeline: readFormValue(formData, "timeline"),
      notes: readFormValue(formData, "notes"),
      company: readFormValue(formData, "company"),
    };

    setSubmitting(true);
    setSubmissionError("");

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inquiry, ...(budgetProject ? { budgetProject: { ...budgetProject, location: inquiry.location } } : {}) }),
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok || !isAcceptedInquiryResponse(result)) {
        throw new Error("Inquiry delivery failed.");
      }

      setSubmittedBudget(budgetProject ? JSON.stringify(budgetProject) : null);
      setSubmitted(true);
    } catch {
      setSubmissionError(
        "We couldn’t submit your project details right now. Please try again shortly.",
      );
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section
      id="reserve"
      className="scroll-mt-20 bg-[#e8e6df] px-5 py-24 text-[#0b0c10] sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="mx-auto grid max-w-[1504px] gap-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-24">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/48">
            Project review / First step
          </p>
          <HeadlineReveal variant="sweep" className="mt-7">
            <h2 className="text-[clamp(3.5rem,6.8vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.075em]">
              Make room
              <br />
              for certainty.
            </h2>
          </HeadlineReveal>
          <p className="mt-8 max-w-lg text-base leading-7 text-black/58">
            Tell us where you are in the process. We’ll review your land,
            timeline, financing context, and preferred design, then map the
            clearest next step.
          </p>
          <div className="mt-12 flex items-start gap-4 border-t border-black/15 pt-6">
            <ShieldCheck size={20} strokeWidth={1.5} />
            <p className="max-w-sm text-xs leading-5 text-black/52">
              Your project review starts the conversation. Final scope, price,
              feasibility, financing, and schedule remain subject to project
              review and agreement.
            </p>
          </div>
        </div>

        <div className="border-t border-black/25 pt-8">
          <AnimatePresence mode="wait">
            {submitted && budgetUnchanged ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-[540px] flex-col justify-between"
              >
                <div className="grid size-14 place-items-center rounded-full bg-[#0b0c10] text-white">
                  <Check size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                    Inquiry received
                  </p>
                  <h3 className="mt-5 max-w-2xl text-4xl font-medium leading-tight tracking-[-0.055em] sm:text-6xl">
                    Your project has a place to begin.
                  </h3>
                  <p className="mt-6 max-w-xl text-base leading-7 text-black/55">
                    Thank you for reaching out. We have received your project
                    details and our team will follow up shortly.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                className="grid gap-x-6 gap-y-8 sm:grid-cols-2"
              >
                {submitted && !budgetUnchanged ? <p role="status" className="sm:col-span-2 text-sm leading-6">Your plan has changed since the last enquiry. Submit this form to send the updated selections.</p> : null}
                <label className="form-field">
                  <span>First name</span>
                  <input name="firstName" autoComplete="given-name" required />
                </label>
                <label className="form-field">
                  <span>Last name</span>
                  <input name="lastName" autoComplete="family-name" required />
                </label>
                <label className="form-field">
                  <span>Email address</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Phone</span>
                  <input type="tel" name="phone" autoComplete="tel" />
                </label>
                {budgetProject ? (
                  <div className="form-field sm:col-span-2">
                    <span>Selected homes</span>
                    <p className="text-sm leading-6">{budgetProject.homes.map((line) => `${models.find((home) => home.slug === line.modelId)?.name} × ${line.quantity}`).join("; ")}</p>
                    <a href="#budget-homes" className="inline-flex min-h-11 items-center text-xs underline">Edit homes and selections in your planner</a>
                  </div>
                ) : <label className="form-field sm:col-span-2">
                  <span>Preferred model</span>
                  <select name="model" defaultValue={defaultModel}>
                    <option value="">Still exploring</option>
                    {models.map((model) => (
                      <option key={model.slug} value={model.slug}>
                        {model.name}{model.squareFeet ? ` — ${model.squareFeet.toLocaleString()} sq. ft.` : ""}
                      </option>
                    ))}
                  </select>
                </label>}
                <label className="form-field">
                  <span>Project location</span>
                  <input
                    name="location"
                    maxLength={160}
                    {...(budgetProject ? { value: budgetProject.location, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onBudgetLocationChange?.(event.target.value) } : {})}
                    placeholder="City, province"
                    autoComplete="address-level2"
                  />
                </label>
                <label className="form-field">
                  <span>Desired start</span>
                  <select name="timeline" defaultValue="">
                    <option value="" disabled>
                      Select a timeframe
                    </option>
                    <option>0–3 months</option>
                    <option>3–6 months</option>
                    <option>6–12 months</option>
                    <option>12+ months</option>
                  </select>
                </label>
                <label className="form-field sm:col-span-2">
                  <span>What should we know?</span>
                  <textarea
                    name="notes"
                    defaultValue={defaultNotes}
                    rows={3}
                    placeholder="Land status, project goals, permit or financing questions…"
                  />
                </label>
                <label className="hidden" aria-hidden="true">
                  <span>Company</span>
                  <input
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting}
                    className="group flex w-full items-center justify-between bg-[#0b0c10] px-6 py-5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#20232a] disabled:cursor-wait disabled:opacity-70"
                  >
                    {submitting
                      ? "Sending inquiry…"
                      : "Request a project review"}
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>
                  {submissionError ? (
                    <p
                      role="alert"
                      className="mt-4 text-xs leading-5 text-black/60"
                    >
                      {submissionError}
                    </p>
                  ) : null}
                  <p className="mt-4 text-[10px] leading-4 text-black/40">
                    By submitting, you agree to be contacted about your House
                    Delivery project. No payment is collected here.
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
