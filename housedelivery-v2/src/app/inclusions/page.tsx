import type { Metadata } from "next";

import { InclusionsLibrary } from "@/components/inclusions-library";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "House Delivery Inclusions Overview",
  description:
    "Explore the products, finishes and systems House Delivery coordinates into complete custom, laneway, carriage and pre-approved homes.",
  openGraph: {
    title: "House Delivery Inclusions Overview",
    description:
      "Explore the products, finishes and systems House Delivery coordinates into complete custom, laneway, carriage and pre-approved homes.",
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
