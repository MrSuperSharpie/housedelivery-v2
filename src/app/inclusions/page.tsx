import type { Metadata } from "next";

import { InclusionsLibrary } from "@/components/inclusions-library";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Finishes & Inclusions | House Delivery",
  description:
    "Explore the coordinated kitchens, bathrooms, flooring, wardrobes, doors, openings and finish directions available through House Delivery.",
  openGraph: {
    title: "Finishes & Inclusions | House Delivery",
    description:
      "See how House Delivery turns curated design selections into one coordinated home and project Look Book.",
    type: "website",
  },
};

export default function InclusionsPage() {
  return (
    <>
      <SiteHeader />
      <InclusionsLibrary />
    </>
  );
}
