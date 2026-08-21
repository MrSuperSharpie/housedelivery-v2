import type { Metadata } from "next";

import { InclusionsLibrary } from "@/components/inclusions-library";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Finishes & Inclusions | House Delivery",
  description:
    "See how House Delivery coordinates flooring, cabinetry, surfaces, windows, doors, bathrooms, lighting, appliances and other visible elements into curated whole-home design directions.",
  openGraph: {
    title: "The Final Layer, Made Personal | House Delivery",
    description:
      "Explore the curated finishes and inclusions that bring a House Delivery home together as one considered whole.",
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
