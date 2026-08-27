import type { Metadata } from "next";

import { HomeownerJourney } from "@/components/homeowner-journey";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Your House Delivery Journey",
  description:
    "Follow the individual homeowner journey from property review and home selection through site-specific design, light-gauge steel assembly, finishing and occupancy.",
  openGraph: {
    title: "Your House Delivery Journey | House Delivery",
    description:
      "A clear, coordinated path from your property and home selection to project review, delivery, assembly and occupancy.",
    type: "website",
    images: [
      {
        url: "/images/how-it-works/house-delivery-process.png",
        alt: "The House Delivery homeowner journey",
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
