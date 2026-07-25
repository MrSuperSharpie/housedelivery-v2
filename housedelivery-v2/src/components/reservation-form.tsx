"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

import type { HomeModel } from "@/data/models";

type ReservationFormProps = {
  models: readonly HomeModel[];
};

export function ReservationForm({ models }: ReservationFormProps) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
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
          <h2 className="mt-7 text-[clamp(3.5rem,6.8vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.075em]">
            Make room
            <br />
            for certainty.
          </h2>
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
            {submitted ? (
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
                    Inquiry prepared
                  </p>
                  <h3 className="mt-5 max-w-2xl text-4xl font-medium leading-tight tracking-[-0.055em] sm:text-6xl">
                    Your project has a place to begin.
                  </h3>
                  <p className="mt-6 max-w-xl text-base leading-7 text-black/55">
                    This prototype does not yet connect to a CRM. Email{" "}
                    <a
                      className="border-b border-black"
                      href="mailto:hello@housedelivery.ca"
                    >
                      hello@housedelivery.ca
                    </a>{" "}
                    to send your project details directly.
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
                <label className="form-field sm:col-span-2">
                  <span>Preferred model</span>
                  <select name="model" defaultValue="">
                    <option value="">Still exploring</option>
                    {models.map((model) => (
                      <option key={model.slug} value={model.slug}>
                        {model.name} — {model.squareFeet.toLocaleString()} sq. ft.
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Project location</span>
                  <input
                    name="location"
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
                    rows={3}
                    placeholder="Land status, project goals, permit or financing questions…"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="group flex w-full items-center justify-between bg-[#0b0c10] px-6 py-5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#20232a]"
                  >
                    Request a project review
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>
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
