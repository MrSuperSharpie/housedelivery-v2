"use client";

import {
  ArrowDown,
  ArrowRight,
  Check,
  Download,
  House,
} from "lucide-react";
import Link from "next/link";
import {
  type ReactNode,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  HomeConfiguration,
  HomeConfiguratorDefinition,
} from "@/data/home-configurator";
import {
  attributionEventProperties,
  trackLookBookEvent,
} from "@/lib/lookbook/analytics";
import { getFirstTouchAttribution } from "@/lib/lookbook/attribution";
import type { LookBookAttribution } from "@/lib/lookbook/types";

type LookBookCompletionActionsProps = {
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
  initialConfigurationId?: string;
  initialHasContact?: boolean;
  savedView?: boolean;
  enabled?: boolean;
  children: ReactNode;
};

type SubmissionResult = {
  accepted: true;
  saved: true;
  configurationId: string;
  leadState: "known_engaged" | "qualified_inquiry";
  followUpRequested: boolean;
  emailSent?: boolean;
};

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isSubmissionResult(value: unknown): value is SubmissionResult {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "accepted" in value &&
    (value as { accepted?: unknown }).accepted === true &&
    "configurationId" in value &&
    typeof (value as { configurationId?: unknown }).configurationId === "string"
  );
}

function createClientConfigurationId() {
  return globalThis.crypto?.randomUUID?.();
}

const inputClass =
  "min-h-12 w-full border-0 border-b border-black/22 bg-transparent px-0 py-3 text-base text-black placeholder:text-black/32 focus:border-black focus:outline-none";
const selectClass = `${inputClass} rounded-none`;
const labelClass =
  "grid gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/58";

export function LookBookCompletionActions({
  definition,
  configuration,
  initialConfigurationId,
  initialHasContact = false,
  savedView = false,
  enabled = true,
  children,
}: LookBookCompletionActionsProps) {
  const [configurationId, setConfigurationId] = useState(
    initialConfigurationId,
  );
  const [hasSavedContact, setHasSavedContact] = useState(initialHasContact);
  const [activeForm, setActiveForm] = useState<"email" | "property" | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [emailDeliveryPending, setEmailDeliveryPending] = useState(false);
  const [propertySubmitted, setPropertySubmitted] = useState(false);
  const [configurationSaved, setConfigurationSaved] = useState(
    Boolean(initialConfigurationId),
  );
  const [attribution] = useState<LookBookAttribution>(() =>
    getFirstTouchAttribution(),
  );
  const submittedRef = useRef(false);
  const eventBase = {
    home_slug: definition.homeId,
    home_name: definition.homeName,
    home_family: "custom-home",
    ...attributionEventProperties(attribution),
  };

  useEffect(() => {
    if (!savedView) return;
    trackLookBookEvent("lookbook_reopened", eventBase);
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.get("download") === "1") {
      window.setTimeout(() => window.print(), 400);
    }
    // The saved-view event should only fire once per mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedView]);

  function downloadLookBook() {
    trackLookBookEvent("lookbook_downloaded", eventBase);
    window.print();
  }

  function openEmailForm() {
    setError("");
    setActiveForm("email");
    trackLookBookEvent("lookbook_email_started", eventBase);
  }

  function openPropertyForm() {
    setError("");
    setActiveForm("property");
    trackLookBookEvent("property_check_started", eventBase);
  }

  function scrollToPrimaryForm(formId: string) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(formId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    });
  }

  function openEmailFormFromClosing() {
    openEmailForm();
    scrollToPrimaryForm("lookbook-email-form");
  }

  function openPropertyFormFromClosing() {
    openPropertyForm();
    scrollToPrimaryForm("lookbook-property-form");
  }

  async function submitPayload(payload: Record<string, unknown>) {
    const response = await fetch("/api/lookbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok && response.status !== 202) {
      const message =
        result && typeof result === "object" && "error" in result
          ? String((result as { error: unknown }).error)
          : "We couldn’t save your Look Book right now.";
      throw new Error(message);
    }
    if (!isSubmissionResult(result)) {
      throw new Error("We couldn’t confirm that your Look Book was saved.");
    }
    return result;
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formValue(formData, "email");
    const followUpRequested = formData.get("followUpRequested") === "on";
    const submissionConfigurationId =
      configurationId ?? createClientConfigurationId();
    if (submissionConfigurationId) {
      setConfigurationId(submissionConfigurationId);
    }

    try {
      const result = await submitPayload({
        intent: "email",
        configurationId: submissionConfigurationId,
        homeSlug: definition.homeId,
        configuration,
        contact: {
          firstName: formValue(formData, "firstName"),
          email,
          phone: formValue(formData, "phone"),
        },
        followUpRequested,
        attribution,
        company: formValue(formData, "company"),
      });
      setConfigurationId(result.configurationId);
      setConfigurationSaved(true);
      setHasSavedContact(true);
      setSavedEmail(email);
      setEmailDeliveryPending(result.emailSent === false);
      setActiveForm(null);
      trackLookBookEvent("lookbook_email_submitted", eventBase);
      if (followUpRequested) {
        trackLookBookEvent("follow_up_requested", eventBase);
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "We couldn’t save your Look Book right now.",
      );
    } finally {
      submittedRef.current = false;
      setSubmitting(false);
    }
  }

  async function submitProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const submissionConfigurationId =
      configurationId ?? createClientConfigurationId();
    if (submissionConfigurationId) {
      setConfigurationId(submissionConfigurationId);
    }
    try {
      const result = await submitPayload({
        intent: "property_check",
        configurationId: submissionConfigurationId,
        ...(!hasSavedContact
          ? {
              homeSlug: definition.homeId,
              configuration,
              contact: {
                firstName: formValue(formData, "firstName"),
                email: formValue(formData, "email"),
                phone: formValue(formData, "phone"),
              },
              attribution,
            }
          : {}),
        property: {
          municipality: formValue(formData, "municipality"),
          province: formValue(formData, "province"),
          postalCode: formValue(formData, "postalCode"),
          propertyStatus: formValue(formData, "propertyStatus"),
          projectType: formValue(formData, "projectType"),
          timing: formValue(formData, "timing"),
          address: formValue(formData, "address"),
          unitCount: formValue(formData, "unitCount"),
          notes: formValue(formData, "notes"),
        },
        company: formValue(formData, "company"),
      });
      setConfigurationId(result.configurationId);
      setConfigurationSaved(true);
      setHasSavedContact(true);
      setPropertySubmitted(true);
      setActiveForm(null);
      trackLookBookEvent("property_check_submitted", eventBase);
      trackLookBookEvent("follow_up_requested", eventBase);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "We couldn’t submit your property details right now.",
      );
    } finally {
      submittedRef.current = false;
      setSubmitting(false);
    }
  }

  const savedUrl = configurationId
    ? `/lookbook/${configurationId}`
    : undefined;
  const hasSavedLookBook = configurationSaved && savedUrl;

  if (!enabled) return <>{children}</>;

  return (
    <>
      <section
        className="look-book-screen-control scroll-mt-24 bg-[#111216] px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-12 lg:py-24"
        data-lookbook-lead-capture
      >
        <div className="mx-auto max-w-[1504px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/58">
            Configuration complete
          </p>
          <h3 className="mt-5 max-w-4xl text-[clamp(2.5rem,5.5vw,5.75rem)] font-medium leading-[0.9] tracking-[-0.065em] text-white">
            Your {definition.homeName} is ready.
          </h3>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/64">
            Your selections have been brought together into your personalized House
            Delivery Look Book.
          </p>

          {propertySubmitted ? (
            <div role="status" className="mt-8 border border-white/24 p-6 sm:p-8">
              <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-white">
                <Check className="size-4" aria-hidden="true" /> Request received
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/66">
                House Delivery has your {definition.homeName} selections and
                property information. We’ll review the project details and follow
                up regarding next steps.
              </p>
            </div>
          ) : savedEmail ? (
            <div role="status" className="mt-8 border border-white/24 p-6 sm:p-8">
              <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-white">
                <Check className="size-4" aria-hidden="true" /> Look Book saved
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/66">
                {emailDeliveryPending
                  ? "Your selections are safely saved, but email delivery is temporarily delayed. You can view or download your Look Book now and retry the email shortly."
                  : `We’ve sent your ${definition.homeName} Look Book to ${savedEmail}.`}
              </p>
            </div>
          ) : null}

          {hasSavedLookBook ? (
            <div
              className={`mt-8 grid max-w-3xl gap-3 ${savedView ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}
              data-lookbook-saved-actions
            >
              {!savedView ? (
                <Link
                  href={hasSavedLookBook}
                  className="flex min-h-14 items-center justify-between gap-5 bg-white px-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-black hover:bg-white/84 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <span>Open My Saved Look Book</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={downloadLookBook}
                className="flex min-h-14 items-center justify-between gap-5 border border-white/44 px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span>Download PDF</span>
                <Download className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : !savedView ? (
            <div className="mt-8 max-w-3xl">
              <button
                type="button"
                onClick={openEmailForm}
                aria-expanded={activeForm === "email"}
                data-lookbook-primary-cta
                className="flex min-h-16 w-full items-center justify-between gap-6 bg-white px-6 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-black hover:bg-white/84 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:px-8"
              >
                <span>Get My Look Book</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58">
                Keep your selections, return anytime, and receive your personalized
                Look Book.
              </p>
            </div>
          ) : null}

          <a
            href="#home-look-book-content"
            data-lookbook-anonymous-link
            className="mt-8 inline-flex min-h-11 items-center gap-3 border-b border-white/28 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/64 transition-colors hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            View online without saving
            <ArrowDown className="size-4" aria-hidden="true" />
          </a>

          {activeForm === "email" ? (
            <form
              id="lookbook-email-form"
              onSubmit={submitEmail}
              className="mt-6 max-w-3xl bg-[#e7e3d8] p-6 text-black sm:p-9"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
                    Keep your Look Book
                  </p>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-black/62">
                    Keep your selections, return anytime, and receive your
                    personalized Look Book.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveForm(null)}
                  className="min-h-11 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/58"
                >
                  Close
                </button>
              </div>
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <label className={labelClass}>
                  First name / Required
                  <input className={inputClass} name="firstName" autoComplete="given-name" required />
                </label>
                <label className={labelClass}>
                  Email address / Required
                  <input className={inputClass} type="email" name="email" autoComplete="email" required />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  Phone / Optional
                  <input className={inputClass} type="tel" name="phone" autoComplete="tel" />
                </label>
              </div>
              <label className="mt-7 flex min-h-12 items-start gap-3 text-sm leading-6 text-black/72">
                <input className="mt-1 size-5 shrink-0 accent-black" type="checkbox" name="followUpRequested" />
                <span>I’d like House Delivery to help me explore this home further.</span>
              </label>
              <label className="hidden" aria-hidden="true">
                Company<input name="company" tabIndex={-1} autoComplete="off" />
              </label>
              <p className="mt-6 text-xs leading-5 text-black/52">
                We’ll use these details to deliver and save this Look Book. Project
                follow-up only happens if you request it above. This does not
                subscribe you to marketing.
              </p>
              {error ? <p role="alert" className="mt-5 bg-amber-100 p-4 text-sm leading-6 text-amber-900">{error}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="mt-7 flex min-h-14 w-full items-center justify-between gap-5 bg-black px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white disabled:cursor-wait disabled:opacity-55"
              >
                <span>{submitting ? "Saving…" : "Get My Look Book"}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </form>
          ) : null}

          <div id="check-my-property" className="mt-12 border-t border-white/18 pt-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/52">
              Optional next step
            </p>
            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h4 className="text-2xl font-medium tracking-[-0.04em] text-white sm:text-3xl">
                  Could this home work for your property?
                </h4>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                  Share a few project details when you’d like House Delivery to
                  review fit and next steps.
                </p>
              </div>
              <button
                type="button"
                onClick={openPropertyForm}
                aria-expanded={activeForm === "property"}
                className="flex min-h-14 items-center justify-between gap-5 border border-white/44 px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-white hover:text-black"
              >
                <span>Check My Property</span>
                <House className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {activeForm === "property" ? (
            <form
              id="lookbook-property-form"
              onSubmit={submitProperty}
              className="mt-6 max-w-4xl bg-[#e7e3d8] p-6 text-black sm:p-9"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
                    Property feasibility
                  </p>
                  <h4 className="mt-3 text-2xl font-medium tracking-[-0.04em]">
                    Check my property
                  </h4>
                </div>
                <button type="button" onClick={() => setActiveForm(null)} className="min-h-11 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/58">Close</button>
              </div>
              {!hasSavedContact ? (
                <div className="mt-7 grid gap-6 border-b border-black/15 pb-7 sm:grid-cols-2">
                  <label className={labelClass}>First name / Required<input className={inputClass} name="firstName" autoComplete="given-name" required /></label>
                  <label className={labelClass}>Email address / Required<input className={inputClass} type="email" name="email" autoComplete="email" required /></label>
                  <label className={`${labelClass} sm:col-span-2`}>Phone / Optional<input className={inputClass} type="tel" name="phone" autoComplete="tel" /></label>
                </div>
              ) : null}
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <label className={labelClass}>City / Municipality<input className={inputClass} name="municipality" autoComplete="address-level2" required /></label>
                <label className={labelClass}>Province<input className={inputClass} name="province" autoComplete="address-level1" defaultValue="British Columbia" required /></label>
                <label className={labelClass}>Postal code<input className={inputClass} name="postalCode" autoComplete="postal-code" required /></label>
                <label className={labelClass}>Property status<select className={selectClass} name="propertyStatus" defaultValue="" required><option value="" disabled>Select one</option><option value="owned_or_controlled">I own/control the property</option><option value="acquiring">I’m in the process of acquiring it</option><option value="identified">I have a property identified</option><option value="exploring">I’m still exploring</option></select></label>
                <label className={labelClass}>Project type<select className={selectClass} name="projectType" defaultValue="" required><option value="" disabled>Select one</option><option value="one_home">One Home</option><option value="multiple_homes">Multiple Homes</option><option value="development_project">Development Project</option><option value="first_nations_community_housing">First Nations / Community Housing</option><option value="general_contractor_builder">General Contractor / Builder</option><option value="other">Other</option></select></label>
                <label className={labelClass}>Approximate timing<select className={selectClass} name="timing" defaultValue="" required><option value="" disabled>Select one</option><option value="as_soon_as_possible">As soon as possible</option><option value="within_6_months">Within 6 months</option><option value="6_to_12_months">6 to 12 months</option><option value="12_plus_months">12+ months</option><option value="just_exploring">Just exploring</option></select></label>
                <label className={`${labelClass} sm:col-span-2`}>Property address / Optional<input className={inputClass} name="address" autoComplete="street-address" /></label>
                <label className={labelClass}>Homes / units / Optional<input className={inputClass} type="number" name="unitCount" min="1" max="10000" inputMode="numeric" /></label>
                <label className={`${labelClass} sm:col-span-2`}>Project note / Optional<textarea className={inputClass} name="notes" rows={3} /></label>
              </div>
              <label className="hidden" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
              <p className="mt-7 border border-black/18 p-4 text-sm leading-6 text-black/68">
                By submitting this request, you’re asking House Delivery to contact
                you about whether this home may work for your property or project.
              </p>
              {error ? <p role="alert" className="mt-5 bg-amber-100 p-4 text-sm leading-6 text-amber-900">{error}</p> : null}
              <button type="submit" disabled={submitting} className="mt-7 flex min-h-14 w-full items-center justify-between gap-5 bg-black px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white disabled:cursor-wait disabled:opacity-55"><span>{submitting ? "Submitting…" : "Submit Property Check"}</span><ArrowRight className="size-4" aria-hidden="true" /></button>
            </form>
          ) : null}
        </div>
      </section>

      {children}

      <section
        className="look-book-screen-control bg-[#111216] px-5 pb-16 text-white sm:px-8 sm:pb-20 lg:px-12 lg:pb-24"
        data-lookbook-closing-actions
      >
        <div className="mx-auto grid max-w-[1504px] gap-8 border-t border-white/20 pt-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/52">
              Your {definition.homeName} Look Book
            </p>
            <h3 className="mt-4 text-[clamp(2rem,3.5vw,3.75rem)] font-medium leading-[0.92] tracking-[-0.05em] text-white">
              Ready when you are.
            </h3>
          </div>
          <div className={`grid gap-3 ${savedView ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {!hasSavedLookBook && !savedView ? (
              <button
                type="button"
                onClick={openEmailFormFromClosing}
                aria-expanded={activeForm === "email"}
                className="flex min-h-14 items-center justify-between gap-4 bg-white px-5 text-left text-[9px] font-semibold uppercase tracking-[0.15em] text-black hover:bg-white/84 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span>Get My Look Book</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </button>
            ) : null}
            {hasSavedLookBook && !savedView ? (
              <Link
                href={hasSavedLookBook}
                className="flex min-h-14 items-center justify-between gap-4 bg-white px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-black hover:bg-white/84 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span>Open My Saved Look Book</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={downloadLookBook}
              className={`${savedView ? "bg-white text-black hover:bg-white/84" : "border border-white/44 text-white hover:bg-white hover:text-black"} flex min-h-14 items-center justify-between gap-4 px-5 text-left text-[9px] font-semibold uppercase tracking-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}
            >
              <span>Download My Look Book</span>
              <Download className="size-4 shrink-0" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={openPropertyFormFromClosing}
              aria-expanded={activeForm === "property"}
              className="flex min-h-14 items-center justify-between gap-4 border border-white/44 px-5 text-left text-[9px] font-semibold uppercase tracking-[0.15em] text-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span>Check My Property</span>
              <House className="size-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
