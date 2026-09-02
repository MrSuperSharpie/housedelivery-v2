"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SavedLookBook } from "@/components/saved-lookbook";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import type {
  HomeConfiguration,
  HomeConfiguratorDefinition,
} from "@/data/home-configurator";
import {
  getPlannerReturnHref,
  getPlannerStorageKey,
} from "@/lib/planner-design-session";
import {
  migratePlannerState,
  plannerAudiences,
} from "@/lib/project-planner";

type LocalLookBook = {
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
  returnHref: string;
};

function findLocalLookBook(configurationId: string): LocalLookBook | undefined {
  for (const audience of plannerAudiences) {
    try {
      const serialized = window.localStorage.getItem(
        getPlannerStorageKey(audience),
      );
      if (!serialized) continue;

      const state = migratePlannerState(JSON.parse(serialized));
      if (!state || state.audience !== audience) continue;

      for (const line of state.portfolio) {
        for (const variation of line.designVariations) {
          if (
            variation.lookBookConfigurationId !== configurationId ||
            !variation.configuration
          ) {
            continue;
          }

          const homeSlug = line.modelId.replace(/^custom:/, "");
          const registration = getHomeConfiguratorRegistration(
            "custom-home",
            homeSlug,
          );
          const definition = registration?.definition;
          if (
            !definition ||
            variation.configuration.homeId !== definition.homeId ||
            variation.configuration.schemaVersion !==
              definition.configurationVersion
          ) {
            continue;
          }

          return {
            definition,
            configuration: variation.configuration,
            returnHref: getPlannerReturnHref(audience, "planner-design-center"),
          };
        }
      }
    } catch {
      // Private browsing or a malformed local draft should not block recovery.
    }
  }

  return undefined;
}

export function PlannerLocalLookBookFallback({
  configurationId,
  storageReadFailed = false,
}: {
  configurationId: string;
  storageReadFailed?: boolean;
}) {
  const [localLookBook, setLocalLookBook] = useState<LocalLookBook>();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocalLookBook(findLocalLookBook(configurationId));
    setHydrated(true);
  }, [configurationId]);

  if (!hydrated) {
    return (
      <section className="mx-auto min-h-[70svh] max-w-[1504px] px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
          My Look Book
        </p>
        <h1 className="mt-6 text-4xl font-medium tracking-[-0.055em] sm:text-6xl">
          Opening your saved design…
        </h1>
      </section>
    );
  }

  if (localLookBook) {
    return (
      <>
        <div className="mx-auto max-w-[1504px] px-5 pt-24 sm:px-8 lg:px-12">
          <div className="look-book-screen-control flex flex-col gap-4 border-y border-white/14 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Project Look Book / Saved on this device
              </p>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-white/48">
                This design is safely attached to your active project. It becomes a server-saved project record when Project Review is submitted.
              </p>
            </div>
            <Link
              href={localLookBook.returnHref}
              className="inline-flex min-h-11 items-center border-b border-white/28 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/68 hover:border-white hover:text-white"
            >
              ← Return to My Project
            </Link>
          </div>
        </div>
        <SavedLookBook
          definition={localLookBook.definition}
          configuration={localLookBook.configuration}
          configurationId={configurationId}
        />
      </>
    );
  }

  return (
    <section className="mx-auto min-h-[70svh] max-w-[1504px] px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
        My Look Book
      </p>
      <h1 className="mt-6 max-w-4xl text-4xl font-medium tracking-[-0.055em] sm:text-6xl">
        {storageReadFailed
          ? "Your Look Book is temporarily unavailable."
          : "This Look Book is not available on this device."}
      </h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-white/56">
        {storageReadFailed
          ? "Please retry in a moment. If this Look Book belongs to an active Planner project on this device, return to the project and reopen the saved design."
          : "A project Look Book created before Project Review remains with the device where the project was created. Return to that project to reopen the saved design."}
      </p>
      <Link
        href="/plan-a-housing-project"
        className="mt-8 inline-flex min-h-11 items-center border-b border-white/28 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/68 hover:border-white hover:text-white"
      >
        Return to Plan a Housing Project
      </Link>
    </section>
  );
}
