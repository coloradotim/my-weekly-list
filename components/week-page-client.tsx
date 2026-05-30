"use client";

import { useState } from "react";
import { OptimisticThisWeekGrid } from "@/components/optimistic-this-week-grid";
import { WeekListEditor } from "@/components/week-list-editor";
import type { ThisWeekViewModel } from "@/lib/week/current";

type WeekNotice = {
  tone: "success" | "error" | "neutral";
  body: string;
} | null;

export function WeekPageClient({
  initialView,
  initialNotice,
}: {
  initialView: ThisWeekViewModel;
  initialNotice: WeekNotice;
}) {
  const [view, setView] = useState(initialView);

  return (
    <>
      <OptimisticThisWeekGrid initialView={view} initialNotice={initialNotice} />
      <WeekListEditor
        view={view}
        onCategoriesChange={(categories) =>
          setView((current) => ({
            ...current,
            categories,
          }))
        }
      />
    </>
  );
}
