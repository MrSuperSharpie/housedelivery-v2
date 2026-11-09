"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CampaignInquiryLink } from "@/components/campaign-inquiry-link";
import { PropertySnapshot } from "@/components/property-snapshot";
import { isPublicPropertySnapshot, type PublicPropertySnapshot } from "@/lib/property-review/types";
import { propertyStatuses, projectTimelines } from "@/lib/build-home-inquiry";
import { captureCampaignAttribution, campaignConsentEvent, storeCampaignReceipt } from "@/lib/campaign-browser";
import type { Campaign } from "@/lib/campaign-lead";
import styles from "@/app/build-your-home/campaign.module.css";

export function CampaignInquiryForm({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const laneway = campaign === "laneway-carriage-homes";
  const [step, setStep] = useState(1);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [verificationError, setVerificationError] = useState(false);
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState("");
  const [snapshot, setSnapshot] = useState<PublicPropertySnapshot>();
  const [reviewToken, setReviewToken] = useState("");
  const reviewedInput = useRef("");
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const endpoint = "/api/build-your-home-inquiries";

  async function refreshToken(signal?: AbortSignal) {
    try {
      const response = await fetch(endpoint, { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok || typeof result.token !== "string") throw new Error();
      setToken(result.token); setVerificationError(false);
    } catch { if (!signal?.aborted) setVerificationError(true); }
  }
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void refreshToken(controller.signal), 0);
    const capture = () => { captureCampaignAttribution(campaign); };
    capture();
    const selectModel = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (typeof name === "string") setModel(name.slice(0, 240));
    };
    window.addEventListener(campaignConsentEvent, capture);
    window.addEventListener("house-delivery:select-model", selectModel);
    return () => { window.clearTimeout(timer); controller.abort(); window.removeEventListener(campaignConsentEvent, capture); window.removeEventListener("house-delivery:select-model", selectModel); };
  }, [campaign]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !token) return;
    if (step === 1) {
      if (!laneway) { setStep(2); setError(""); requestAnimationFrame(() => heading.current?.focus()); return; }
      const data = new FormData(event.currentTarget);
      const propertyAddress = String(data.get("propertyAddress") ?? "").trim();
      const municipality = String(data.get("municipality") ?? "").trim();
      const input = JSON.stringify([propertyAddress, municipality]);
      if (reviewToken && snapshot && reviewedInput.current === input) { setStep(2); setError(""); requestAnimationFrame(() => heading.current?.focus()); return; }
      busy.current = true; setSending(true); setError(""); setSnapshot(undefined); setReviewToken("");
      try {
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "property_review", propertyAddress, municipality, company: String(data.get("company") ?? ""), token }), signal: AbortSignal.timeout(45_000) });
        const result = await response.json().catch(() => null);
        if (!response.ok || !isPublicPropertySnapshot(result?.propertySnapshot) || typeof result?.reviewToken !== "string") {
          if (result?.refreshToken) await refreshToken();
          throw new Error(result?.error || "We couldn’t check this property. Please try again or email our team.");
        }
        setSnapshot(result.propertySnapshot); setReviewToken(result.reviewToken); reviewedInput.current = input;
        setStep(2); requestAnimationFrame(() => heading.current?.focus());
      } catch (failure) {
        setError(failure instanceof Error && !["TimeoutError", "TypeError"].includes(failure.name) ? failure.message : "The property check is temporarily unavailable. Please retry or email our team.");
      } finally { busy.current = false; setSending(false); }
      return;
    }
    busy.current = true; setSending(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, token, campaign, ...(laneway ? { reviewToken } : {}), modelInterest: model, attribution: captureCampaignAttribution(campaign) }), signal: AbortSignal.timeout(20_000) });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.accepted !== true || typeof result.inquiryId !== "string") {
        if (result?.refreshToken) await refreshToken();
        if (laneway && (result?.refreshToken || result?.reviewAgain)) { setSnapshot(undefined); setReviewToken(""); reviewedInput.current = ""; setStep(1); }
        throw new Error(result?.error || "We couldn’t send your inquiry. Please try again or email sales@housedelivery.ca.");
      }
      storeCampaignReceipt(result.inquiryId, campaign);
      router.push("/build-your-home/thank-you");
    } catch (failure) {
      setError(failure instanceof Error && !["TimeoutError", "TypeError"].includes(failure.name) ? failure.message : "We couldn’t confirm delivery. Your details are still here. Please retry or email our team.");
    } finally { busy.current = false; setSending(false); }
  }

  return <form className={styles.form} onSubmit={submit} aria-label={laneway ? "Free preliminary property review" : "Custom home inquiry"} data-clarity-mask="true" data-review-step={step}>
    <p className={styles.kicker}>Your project / Step {step} of 2</p>
    <h2 ref={heading} tabIndex={-1}>{step === 1 ? laneway ? "What could your property become?" : "Let’s shape your next home." : laneway ? "Your preliminary property snapshot." : "Let’s start a conversation."}</h2>
    <p className={styles.formIntro}>{step === 1 ? laneway ? "Enter your property details for a free preliminary check using available government data. No purchase commitment." : "Tell us a little about where you want to build." : laneway ? "Review your snapshot, then request a conversation with our team." : "Our team will review your plans and follow up personally."}</p>
    {step === 2 && laneway && snapshot ? <PropertySnapshot snapshot={snapshot} showActions={false} beforeInquiry onClose={() => {}} onCheckAnother={() => {}} onReviewCta={() => {}} /> : null}
    <p className={styles.formHint}>Required unless marked optional.</p>
    <fieldset hidden={step !== 1} className={styles.fields}>
      <legend className={styles.srOnly}>Your property and timing</legend>
      <label>City or municipality<input name="municipality" autoComplete="address-level2" maxLength={160} required placeholder="Where in British Columbia?" /></label>
      {laneway ? <label>Property address<input name="propertyAddress" autoComplete="street-address" maxLength={240} required placeholder="Street address" /></label> : null}
      {laneway ? <label>Type of home<select name="projectType" defaultValue="" required><option value="" disabled>Select a home type</option>{["Laneway home", "Carriage home", "Still exploring"].map(v => <option key={v}>{v}</option>)}</select></label> : <input name="projectType" type="hidden" value="Custom home" />}
      <label>Do you own the property?<select name="ownership" defaultValue="" required><option value="" disabled>Select your property status</option>{propertyStatuses.map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Anticipated construction timeline<select name="timeline" defaultValue="" required><option value="" disabled>Select a timeframe</option>{projectTimelines.map(v => <option key={v}>{v}</option>)}</select></label>
    </fieldset>
    <fieldset hidden={step !== 2} disabled={step !== 2} className={styles.fields}>
      <legend className={styles.srOnly}>Your contact details</legend>
      <label>Full name<input name="fullName" autoComplete="name" maxLength={160} required /></label>
      <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label>Phone number <span>(optional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={50} /></label>
      <label>Anything you’d like us to know? <span>(optional)</span><textarea name="details" rows={3} maxLength={2500} placeholder="Your ideas, priorities or questions" /></label>
    </fieldset>
    {model ? <p className={styles.modelSelected}>Your interest: {model} <button type="button" onClick={() => setModel("")}>Clear</button></p> : null}
    <div hidden aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
    {verificationError ? <p role="alert" className={styles.error}>Form verification is unavailable. <button type="button" onClick={() => void refreshToken()}>Retry verification</button> or email our team.</p> : null}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <button className={styles.button} type="submit" disabled={sending || !token} aria-busy={sending}>{step === 1 ? sending ? "Checking your property…" : laneway ? "Check My Property" : "Continue" : sending ? "Sending your inquiry…" : "Request a Conversation"}<span aria-hidden="true">→</span></button>
    {step === 2 ? <button type="button" className={styles.back} disabled={sending} onClick={() => { setStep(1); setError(""); requestAnimationFrame(() => heading.current?.focus()); }}>← Back to property details</button> : null}
    <p className={styles.formPrivacy}>By submitting, you ask House Delivery to contact you about your project. We use our email provider and sales records to handle your inquiry. No marketing subscription. <Link href="/privacy">Privacy &amp; Cookies</Link></p>
    <p className={styles.formPrivacy}>Prefer email? <a href="mailto:sales@housedelivery.ca">sales@housedelivery.ca</a></p>
    <noscript>Please email sales@housedelivery.ca to discuss your project.</noscript>
  </form>;
}

export function ModelInquiryLink({ name }: { name: string }) {
  return <CampaignInquiryLink className={styles.textLink} model={name}>Discuss {name}<span aria-hidden="true">↓</span></CampaignInquiryLink>;
}
