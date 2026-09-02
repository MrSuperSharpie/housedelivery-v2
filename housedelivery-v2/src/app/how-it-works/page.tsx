import type { Metadata } from "next";

import { HomeownerJourney } from "@/components/homeowner-journey";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "How House Delivery Works",
  description:
    "See the House Delivery process from site and home selection through design, approvals, manufacturing, local assembly and occupancy.",
  openGraph: {
    title: "How House Delivery Works | House Delivery",
    description:
      "A coordinated path from site and home selection through design, approvals, manufacturing, assembly and occupancy.",
    type: "website",
    images: [
      {
        url: "/images/how-it-works/house-delivery-process.png",
        alt: "The House Delivery process",
      },
    ],
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <HomeownerJourney />
    </>
  );
}
