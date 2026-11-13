"use client";

import { useSearchParams } from "next/navigation";
import { ReservationForm } from "@/components/reservation-form";
import type { HomeModel } from "@/data/models";
import { resolveInitialModelSlug } from "@/lib/model-inquiry";

export function ReservationFormFromQuery({ models }: { models: readonly HomeModel[] }) {
  const searchParams = useSearchParams();
  const initialModel = resolveInitialModelSlug(searchParams.get("model"), models);
  return <ReservationForm key={initialModel || "exploring"} models={models} initialModel={initialModel} />;
}
