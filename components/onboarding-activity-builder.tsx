"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  addOnboardingActivityClientAction,
  addOnboardingCategoryClientAction,
} from "@/app/(app)/onboarding/actions";
import type { OnboardingActivity, OnboardingCategory } from "@/lib/onboarding/current";

type StatusMessage =
  | { tone: "success"; body: string }
  | { tone: "error"; body: string }
  | null;

export function OnboardingActivityBuilder({
  initialCategories,
  initialActivities,
}: {
  initialCategories: OnboardingCategory[];
  initialActivities: OnboardingActivity[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [activities, setActivities] = useState(initialActivities);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [isPending, startTransition] = useTransition();
  const activitiesByCategory = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.id,
          activities.filter((activity) => activity.categoryId === category.id),
        ]),
      ),
    [activities, categories],
  );

  function addCategory(form: HTMLFormElement) {
    const formData = new FormData(form);
    const categoryName = String(formData.get("categoryName") ?? "").trim();

    if (!categoryName) {
      return;
    }

    setStatus(null);
    startTransition(() => {
      void addOnboardingCategoryClientAction(formData)
        .then((result) => {
          if (result.status !== "updated") {
            setStatus({
              tone: "error",
              body: result.message || "That category could not be saved. Try again.",
            });
            return;
          }

          setCategories((current) =>
            mergeCategory(current, {
              ...result.category,
              sortOrder: result.category.sortOrder,
            }),
          );
          setStatus({ tone: "success", body: `Added ${result.category.name}.` });
          form.reset();
        })
        .catch(() => {
          setStatus({
            tone: "error",
            body: "That category could not be saved. Try again.",
          });
        });
    });
  }

  function addActivity(form: HTMLFormElement, onSaved: () => void) {
    const formData = new FormData(form);
    const activityName = String(formData.get("activityName") ?? "").trim();

    if (!activityName) {
      return;
    }

    setStatus(null);
    startTransition(() => {
      void addOnboardingActivityClientAction(formData)
        .then((result) => {
          if (result.status !== "updated") {
            setStatus({
              tone: "error",
              body: result.message || "That activity could not be saved. Try again.",
            });
            return;
          }

          setActivities((current) => mergeActivity(current, result.activity));
          setStatus({ tone: "success", body: `Added ${result.activity.name}.` });
          form.reset();
          onSaved();
        })
        .catch(() => {
          setStatus({
            tone: "error",
            body: "That activity could not be saved. Try again.",
          });
        });
    });
  }

  return (
    <div className="space-y-4">
      {status ? <InlineNotice tone={status.tone} body={status.body} /> : null}

      {activities.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-meadow/25 bg-meadow/10 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-stone-800">
            Done for now? Ready to plan your first week?
          </p>
          <Link href="/onboarding?step=plan" className={primaryButtonClassName}>
            Continue to planning
          </Link>
        </div>
      ) : null}

      {categories.map((category) => {
        const categoryActivities = activitiesByCategory.get(category.id) ?? [];

        return (
          <section
            key={category.id}
            className="rounded-lg border border-stone-200 bg-white/80 shadow-soft"
          >
            <div className="border-b border-stone-200 bg-paper px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-clay">
                {category.name}
              </h2>
            </div>
            {categoryActivities.length > 0 ? (
              <ul className="space-y-2 p-3">
                {categoryActivities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-inner shadow-stone-100"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-meadow text-xs font-bold text-white"
                      >
                        ✓
                      </span>
                      <span className="truncate font-semibold text-ink">
                        {activity.name}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-paper px-2 py-1 text-xs font-semibold text-stone-700">
                      {activity.targetCount}/wk
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <ActivityAddForm
              categoryName={category.name}
              disabled={isPending}
              onSubmit={addActivity}
            />
          </section>
        );
      })}

      <section className="rounded-lg border border-stone-200 bg-white/80 p-4 shadow-soft">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            addCategory(event.currentTarget);
          }}
        >
          <label className={labelClassName} htmlFor="additionalCategoryName">
            Add another category
          </label>
          <input
            id="additionalCategoryName"
            name="categoryName"
            type="text"
            autoComplete="off"
            className={inputClassName}
            disabled={isPending}
          />
          <button type="submit" className={secondaryButtonClassName} disabled={isPending}>
            + Add category
          </button>
        </form>
      </section>
    </div>
  );
}

function ActivityAddForm({
  categoryName,
  disabled,
  onSubmit,
}: {
  categoryName: string;
  disabled: boolean;
  onSubmit: (form: HTMLFormElement, onSaved: () => void) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [targetCount, setTargetCount] = useState(1);

  return (
    <form
      ref={formRef}
      className="space-y-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event.currentTarget, () => setTargetCount(1));
      }}
    >
      <input type="hidden" name="categoryName" value={categoryName} />
      <label className={labelClassName} htmlFor={`activity-${categoryName}`}>
        Activity name
      </label>
      <input
        id={`activity-${categoryName}`}
        name="activityName"
        type="text"
        required
        autoComplete="off"
        className={inputClassName}
        disabled={disabled}
      />
      <div>
        <p className={labelClassName}>Target days per week</p>
        <input type="hidden" name="targetCount" value={targetCount} />
        <div className="mt-1 flex w-fit items-center overflow-hidden rounded-full border border-stone-200 bg-white">
          <button
            type="button"
            className="min-h-10 px-4 text-sm font-semibold text-stone-600 disabled:opacity-40"
            onClick={() => setTargetCount((value) => Math.max(0, value - 1))}
            disabled={disabled || targetCount <= 0}
          >
            -
          </button>
          <span className="min-w-16 px-2 text-center text-sm font-semibold text-ink">
            {targetCount}/wk
          </span>
          <button
            type="button"
            className="min-h-10 px-4 text-sm font-semibold text-stone-600 disabled:opacity-40"
            onClick={() => setTargetCount((value) => Math.min(7, value + 1))}
            disabled={disabled || targetCount >= 7}
          >
            +
          </button>
        </div>
      </div>
      <button type="submit" className={primaryButtonClassName} disabled={disabled}>
        Save activity
      </button>
    </form>
  );
}

function InlineNotice({ tone, body }: { tone: "success" | "error"; body: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm leading-6 ${
        tone === "success"
          ? "border-meadow/25 bg-meadow/10 text-stone-800"
          : "border-clay/30 bg-clay/10 text-stone-800"
      }`}
    >
      {body}
    </div>
  );
}

function mergeCategory(categories: OnboardingCategory[], category: OnboardingCategory) {
  return [
    ...categories.filter((current) => current.id !== category.id),
    category,
  ].toSorted(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
}

function mergeActivity(activities: OnboardingActivity[], activity: OnboardingActivity) {
  return [
    ...activities.filter((current) => current.id !== activity.id),
    activity,
  ].toSorted(
    (left, right) =>
      left.categorySortOrder - right.categorySortOrder ||
      left.categoryName.localeCompare(right.categoryName) ||
      left.sortOrder - right.sortOrder ||
      left.name.localeCompare(right.name),
  );
}

const labelClassName = "block text-xs font-semibold uppercase tracking-wide text-clay";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-base text-ink shadow-inner shadow-stone-100 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/40 disabled:bg-stone-100";

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus:ring-2 focus:ring-meadow focus:ring-offset-2 focus:ring-offset-white";

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-clay transition hover:border-clay focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50";
