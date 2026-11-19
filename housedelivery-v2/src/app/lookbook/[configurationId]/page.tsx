import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlannerLocalLookBookFallback } from "@/components/planner-local-lookbook-fallback";
import { SavedLookBook } from "@/components/saved-lookbook";
import { SiteHeader } from "@/components/site-header";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import { parseConfigurationId } from "@/lib/lookbook/domain";
import { getLookBookRepository } from "@/lib/lookbook/repository";
import { canReadSavedLookBook } from "@/lib/planner-review-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved Look Book",
  description: "Return to a saved House Delivery home configuration.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function localPlannerFallback(configurationId: string) {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] text-white">
        <PlannerLocalLookBookFallback
          configurationId={configurationId}
        />
      </main>
    </>
  );
}

export default async function SavedLookBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ configurationId: string }>;
  searchParams: Promise<{ print?: string; local?: string; projectAccess?: string }>;
}) {
  const { configurationId: rawConfigurationId } = await params;
  const configurationId = parseConfigurationId(rawConfigurationId);
  if (!configurationId) notFound();

  const query = await searchParams;
  if (query.local === "1" && query.projectAccess === undefined) {
    return localPlannerFallback(configurationId);
  }

  const record = await getLookBookRepository().findById(configurationId);
  if (!record || !canReadSavedLookBook(record, query.projectAccess)) notFound();

  const registration = getHomeConfiguratorRegistration(
    record.homeFamily,
    record.homeSlug,
  );
  const definition = registration?.definition;
  if (
    !definition ||
    definition.configurationVersion !== record.configuratorVersion ||
    record.configuration.homeId !== definition.homeId
  ) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] text-white">
        <SavedLookBook
          definition={definition}
          configuration={record.configuration}
          configurationId={record.id}
          printMode={query.print === "1"}
        />
      </main>
    </>
  );
}
