"use client";

import { useEffect, useState } from "react";

import {
  readPlannerHomeViewContext,
  type PlannerHomeViewContext,
} from "@/lib/planner-design-session";

export function usePlannerHomeViewContext() {
  const [context, setContext] = useState<PlannerHomeViewContext>();

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (active) {
        setContext(readPlannerHomeViewContext(window.location.search));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return context;
}
