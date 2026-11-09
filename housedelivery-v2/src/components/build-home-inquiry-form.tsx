"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { propertyStatuses, projectTimelines, projectTypes } from "@/lib/build-home-inquiry";
import { trackAnalyticsEvent } from "@/lib/analytics";
import styles from "@/app/build-your-home/landing.module.css";

const endpoint = "/api/build-your-home-inquiries";

export function BuildHomeInquiryForm() {
  const [token, setToken] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const inFlight = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);

  function refreshToken(signal?: AbortSignal) {
    return fetch(endpoint, { cache: "no-store", signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || typeof result.token !== "string") throw new Error("Verification unavailable");
        setToken(result.token);
        setVerificationError("");
      })
      .catch(() => {
        if (signal?.aborted) return;
        setVerificationError("The form couldn’t load its verification. Please retry, or email us directly.");
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    void refreshToken(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (reference) statusRef.current?.focus();
  }, [reference]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!token) {
      setError("Please retry the form verification below, or email us directly.");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries([
      "fullName", "email", "phone", "municipality", "projectType", "ownership", "timeline", "details", "company",
    ].map((key) => [key, String(form.get(key) ?? "").trim()]));
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, token }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.accepted !== true || typeof result.inquiryId !== "string") {
        if (result?.refreshToken) await refreshToken();
        throw new Error(typeof result?.error === "string" ? result.error : "We couldn’t send your inquiry. Please try again or email us directly.");
      }
      setReference(result.inquiryId);
      // Existing consent manager forwards this to GA4 only on the production
      // domain after consent. No contact details, form values or Ads IDs.
      trackAnalyticsEvent("generate_lead", {
        form_name: "build_your_home",
        transaction_id: result.inquiryId,
        lead_source: "build_your_home",
      });
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== "TimeoutError" && failure.name !== "TypeError"
        ? failure.message
        : "We couldn’t confirm delivery. Your details are still here. Please retry, or email us directly.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className={styles.confirmation} ref={statusRef} role="status" tabIndex={-1}>
        <p className={styles.lightEyebrow}>Inquiry received</p>
        <h3>Every great home starts with a conversation.</h3>
        <p>Thank you for sharing your plans. Your inquiry has been sent to the House Delivery team. We’ll review your project and contact you personally to explore the next step.</p>
        <p className={styles.reference}>Your reference: {reference}</p>
        <Link className={styles.textLink} href="/#home-types">Explore our homes <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} data-clarity-mask="true" aria-label="Project inquiry" aria-describedby="inquiry-privacy">
      <p className={styles.formNote}>All fields are required unless marked optional.</p>
      <label className={styles.field}>
        <span>Full name</span>
        <input name="fullName" autoComplete="name" maxLength={160} required />
      </label>
      <label className={styles.field}>
        <span>Email address</span>
        <input name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      <label className={styles.field}>
        <span>Phone number <span className={styles.optional}>(optional)</span></span>
        <input name="phone" type="tel" autoComplete="tel" maxLength={50} />
      </label>
      <label className={styles.field}>
        <span>City or municipality</span>
        <input name="municipality" autoComplete="address-level2" placeholder="Where in British Columbia are you planning to build?" maxLength={160} required />
      </label>
      <label className={styles.field}>
        <span id="project-type-label">Type of project</span>
        <select aria-labelledby="project-type-label" name="projectType" defaultValue="" required>
          <option value="" disabled>Select your project type</option>
          {projectTypes.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span id="property-status-label">Do you currently own the property?</span>
        <select aria-labelledby="property-status-label" name="ownership" defaultValue="" required>
          <option value="" disabled>Select your property status</option>
          {propertyStatuses.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span id="construction-timeline-label">Anticipated construction timeline</span>
        <select aria-labelledby="construction-timeline-label" name="timeline" defaultValue="" required>
          <option value="" disabled>Select a timeframe</option>
          {projectTimelines.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>Project details <span className={styles.optional}>(optional)</span></span>
        <textarea name="details" rows={3} maxLength={2500} placeholder="A little about your plans, your property or what matters most to you." />
      </label>
      <div hidden aria-hidden="true">
        <label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {verificationError ? (
        <div className={styles.error} role="alert">
          <p>{verificationError}</p>
          <button className={styles.textLink} type="button" onClick={() => void refreshToken()}>Retry form verification</button>
        </div>
      ) : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      <button className={`${styles.button} ${styles.submit}`} type="submit" disabled={submitting || !token} aria-busy={submitting}>
        {submitting ? "Sending your inquiry…" : "Request a Conversation"}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
      <p id="inquiry-privacy" className={styles.privacy}>By submitting, you ask House Delivery to contact you about your project. Your details are sent to our team through our email provider to respond to your inquiry. This does not subscribe you to marketing. <Link href="/privacy">Privacy &amp; Cookies</Link></p>
      <p className={styles.directContact}>Prefer email? <a href="mailto:hello@housedelivery.ca">hello@housedelivery.ca</a></p>
      <noscript><p className={styles.error}>Please enable JavaScript to use this form, or email your project details to <a href="mailto:hello@housedelivery.ca">hello@housedelivery.ca</a>.</p></noscript>
    </form>
  );
}
