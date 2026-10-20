import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy & Cookies | House Delivery",
  description:
    "How House Delivery uses analytics, cookies and campaign attribution on HouseDelivery.ca.",
};

const sections = [
  {
    title: "Analytics we use",
    content: (
      <div className="space-y-5">
        <p>
          If you choose <strong>Allow analytics</strong>, House Delivery loads
          Google Analytics 4, Microsoft Clarity and the LinkedIn Insight Tag.
          These services help us understand site visits, useful pages, campaign
          performance and interactions with project tools.
        </p>
        <ul className="space-y-3 border-l border-black/18 pl-5">
          <li>
            <strong>Google Analytics 4</strong> measures page views and selected
            actions. Google Signals and advertising personalization are
            disabled.
          </li>
          <li>
            <strong>Microsoft Clarity</strong> provides site-use and session
            insights. Forms are masked from Clarity recording.
          </li>
          <li>
            <strong>LinkedIn Insight Tag</strong> measures visits and campaign
            performance. LinkedIn Enhanced Matching is not enabled.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "What we measure",
    content: (
      <div className="space-y-5">
        <p>
          We measure page views and actions such as viewing pricing, opening the
          Design My Home configurator, creating or downloading a Look Book,
          selecting major calls to action, clicking an email or phone link, and
          successfully submitting a project or quote request.
        </p>
        <p>
          Form contents and contact information—including names, email
          addresses, phone numbers, addresses, companies and notes—are not sent
          to Google Analytics, Microsoft Clarity or LinkedIn through this
          implementation. Contact information submitted to House Delivery is
          used to respond to the request.
        </p>
      </div>
    ),
  },
  {
    title: "Campaign attribution",
    content: (
      <p>
        We may retain the campaign parameters utm_source, utm_medium,
        utm_campaign, utm_content, utm_term and utm_id. First-touch and
        latest-touch values are kept where practical so we can understand which
        campaigns led to a visit or action. House Delivery does not intentionally
        place contact information in these campaign fields.
      </p>
    ),
  },
  {
    title: "Cookies and your choice",
    content: (
      <div className="space-y-5">
        <p>
          Your analytics choice is stored in your browser so the site can
          respect it on later visits. Campaign attribution and an anonymous
          session identifier may also be stored in local or session storage.
          Analytics providers may use cookies or similar browser storage after
          consent.
        </p>
        <p>
          Choosing <strong>Essential only</strong> prevents the three analytics
          services from loading. We also respect supported Global Privacy
          Control and Do Not Track browser signals. You can clear this site’s
          browser data to reset your choice.
        </p>
      </div>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#e7e3d8] text-[#111216]">
        <section className="px-5 pb-20 pt-32 sm:px-8 sm:pt-40 lg:px-12 lg:pb-28 lg:pt-48">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-10 border-t border-black/18 pt-7 lg:grid-cols-12 lg:gap-x-8">
              <div className="lg:col-span-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/42">
                  House Delivery
                </p>
              </div>
              <div className="lg:col-span-8 lg:col-start-4">
                <h1 className="max-w-4xl text-[clamp(3.4rem,7vw,7.5rem)] font-medium uppercase leading-[0.84] tracking-[-0.075em]">
                  Privacy
                  <br />
                  <span className="text-black/32">&amp; Cookies.</span>
                </h1>
                <p className="mt-10 max-w-3xl text-lg leading-8 text-black/62">
                  This page explains how HouseDelivery.ca uses analytics and
                  campaign attribution. We use these tools to improve the site
                  and understand which project information is useful.
                </p>
                <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.17em] text-black/38">
                  Effective September 22, 2026
                </p>
              </div>
            </div>

            <div className="mt-20 lg:ml-[25%] lg:mt-28 lg:w-3/4">
              {sections.map((section, index) => (
                <section
                  key={section.title}
                  className="grid gap-5 border-t border-black/18 py-9 md:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] md:gap-10 md:py-11"
                >
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/36">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em]">
                      {section.title}
                    </h2>
                  </div>
                  <div className="max-w-3xl text-sm leading-7 text-black/62 [&_strong]:font-semibold [&_strong]:text-black/82">
                    {section.content}
                  </div>
                </section>
              ))}

              <section className="border-t border-black/18 pt-9 md:pt-11">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/36">
                  Questions
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-black/62">
                  Questions about this notice can be sent to{" "}
                  <a
                    className="font-semibold text-black underline decoration-black/25 underline-offset-4 hover:decoration-black"
                    href="mailto:hello@housedelivery.ca"
                  >
                    hello@housedelivery.ca
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
