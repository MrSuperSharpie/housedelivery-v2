import type { Metadata } from "next";

import { InclusionsLibrary } from "@/components/inclusions-library";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "House Delivery Inclusions Library",
  description:
    "Explore House Delivery’s preliminary Essential, Premium and Signature inclusion framework across flooring, cabinetry, doors, windows, bathrooms and more.",
  openGraph: {
    title: "House Delivery Inclusions Library",
    description:
      "Explore House Delivery’s preliminary Essential, Premium and Signature inclusion framework across flooring, cabinetry, doors, windows, bathrooms and more.",
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
