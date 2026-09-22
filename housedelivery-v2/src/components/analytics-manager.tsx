"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  analyticsBrowserEvent,
  classifyAnalyticsClick,
  getSafeAnalyticsPath,
  isProductionAnalyticsHost,
  sanitizeAnalyticsProperties,
  type AnalyticsEventDetail,
  type AnalyticsEventProperties,
} from "@/lib/analytics";
import { getCampaignAttributionProperties } from "@/lib/lookbook/attribution";

const googleAnalyticsId = "G-59Q25GQB61";
const clarityProjectId = "ymeoc631lr";
const linkedInPartnerId = "10059612";
const consentStorageKey = "house-delivery:analytics-consent:v1";

type Consent = "accepted" | "declined";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
  }
}

function readConsent(): Consent | null {
  try {
    const stored = window.localStorage.getItem(consentStorageKey);
    return stored === "accepted" || stored === "declined" ? stored : null;
  } catch {
    return null;
  }
}

function storeConsent(value: Consent) {
  try {
    window.localStorage.setItem(consentStorageKey, value);
  } catch {
    // Consent still applies for the current page when storage is unavailable.
  }
}

function browserPrivacyOptOut() {
  const navigatorWithGpc = navigator as Navigator & {
    globalPrivacyControl?: boolean;
  };
  return (
    navigatorWithGpc.globalPrivacyControl === true ||
    navigator.doNotTrack === "1"
  );
}

export function AnalyticsManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [isPublicProduction, setIsPublicProduction] = useState(false);
  const [providersReady, setProvidersReady] = useState(false);
  const sentPageViews = useRef(new Set<string>());
  const sentPricingViews = useRef(new WeakSet<Element>());
  const enabled = consent === "accepted" && isPublicProduction;
  const trackingReady = enabled && providersReady;

  useEffect(() => {
    const initialize = () => {
      const publicProduction = isProductionAnalyticsHost(
        window.location.hostname,
      );
      setIsPublicProduction(
        publicProduction && !pathname.startsWith("/internal/"),
      );
      if (!publicProduction || pathname.startsWith("/internal/")) return;
      setConsent(browserPrivacyOptOut() ? "declined" : readConsent());
    };
    const timeout = window.setTimeout(initialize, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  const sendEvent = useCallback(
    (event: string, properties: AnalyticsEventProperties = {}) => {
      if (!trackingReady) return;
      const safeProperties = sanitizeAnalyticsProperties({
        ...getCampaignAttributionProperties(),
        ...properties,
      });
      window.gtag?.("event", event, safeProperties);
      window.clarity?.("event", event);
    },
    [trackingReady],
  );

  useEffect(() => {
    if (!trackingReady) return;

    const handleAnalyticsEvent = (event: Event) => {
      const detail = (event as CustomEvent<AnalyticsEventDetail>).detail;
      if (!detail?.event) return;
      const { event: eventName, ...properties } = detail;
      sendEvent(eventName, properties);
    };
    window.addEventListener(analyticsBrowserEvent, handleAnalyticsEvent);
    return () =>
      window.removeEventListener(analyticsBrowserEvent, handleAnalyticsEvent);
  }, [trackingReady, sendEvent]);

  useEffect(() => {
    if (!trackingReady) return;
    const route = getSafeAnalyticsPath(pathname, searchParams);
    if (sentPageViews.current.has(route)) return;
    sentPageViews.current.add(route);
    window.gtag?.("event", "page_view", {
      page_location: `${window.location.origin}${route}`,
      page_path: route,
      page_title: document.title,
      ...getCampaignAttributionProperties(),
    });
  }, [trackingReady, pathname, searchParams]);

  useEffect(() => {
    if (!trackingReady) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>("a, button");
      if (!control) return;
      const href = control instanceof HTMLAnchorElement ? control.href : undefined;
      const eventName = classifyAnalyticsClick({
        href,
        text: control.innerText || control.textContent || "",
      });
      if (!eventName) return;
      const contactEvent = eventName === "email_click" || eventName === "phone_click";
      sendEvent(eventName, {
        link_path:
          href && !contactEvent
            ? new URL(href, window.location.href).pathname
            : undefined,
        link_text: contactEvent
          ? undefined
          : (control.innerText || control.textContent || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 120),
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [trackingReady, sendEvent]);

  useEffect(() => {
    if (!trackingReady) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || sentPricingViews.current.has(entry.target)) {
            continue;
          }
          sentPricingViews.current.add(entry.target);
          sendEvent("pricing_view", { page_path: pathname });
        }
      },
      { threshold: 0.35 },
    );
    document.querySelectorAll("[data-home-pricing]").forEach((element) =>
      observer.observe(element),
    );
    return () => observer.disconnect();
  }, [trackingReady, pathname, sendEvent]);

  useEffect(() => {
    if (!trackingReady) return;
    const maskForms = () => {
      document.querySelectorAll("form").forEach((form) => {
        form.setAttribute("data-clarity-mask", "true");
      });
    };
    maskForms();
    const observer = new MutationObserver(maskForms);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [trackingReady]);

  function chooseConsent(value: Consent) {
    storeConsent(value);
    setConsent(value);
  }

  return (
    <>
      {enabled ? (
        <>
          <Script id="house-delivery-ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config','${googleAnalyticsId}',{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
          <Script
            id="house-delivery-ga"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script
            id="house-delivery-clarity"
            strategy="afterInteractive"
            onReady={() => setProvidersReady(true)}
          >
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${clarityProjectId}");`}
          </Script>
          <Script id="house-delivery-linkedin" strategy="afterInteractive">
            {`window._linkedin_partner_id="${linkedInPartnerId}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];if(window._linkedin_data_partner_ids.indexOf(window._linkedin_partner_id)===-1){window._linkedin_data_partner_ids.push(window._linkedin_partner_id)};(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s)})(window.lintrk);`}
          </Script>
        </>
      ) : null}

      {isPublicProduction && consent === null ? (
        <aside
          aria-label="Analytics preferences"
          className="fixed inset-x-4 bottom-4 z-[120] mx-auto max-w-3xl border border-white/20 bg-[#111216] p-5 text-white shadow-2xl sm:inset-x-8 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-6"
        >
          <p className="max-w-xl text-sm leading-6 text-white/68">
            House Delivery uses analytics and campaign measurement to understand
            which pages and project tools are useful. Contact details and form
            contents are not sent to analytics services.
          </p>
          <div className="mt-5 flex shrink-0 gap-3 sm:mt-0">
            <button
              type="button"
              onClick={() => chooseConsent("declined")}
              className="min-h-11 border border-white/30 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/72"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => chooseConsent("accepted")}
              className="min-h-11 bg-white px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-black"
            >
              Allow analytics
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
