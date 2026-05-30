"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addWeekActivityListItemAction,
  removeWeekActivityFromFutureAction,
  reorderWeekActivitiesAction,
  reorderWeekCategoriesAction,
  updateWeekActivityListItemAction,
} from "@/app/(app)/week/actions";
import type { ThisWeekViewModel, WeekGridActivity } from "@/lib/week/current";

type WeekListCategory = ThisWeekViewModel["categories"][number];

export function WeekListEditor({ view }: { view: ThisWeekViewModel }) {
  const [listCategories, setListCategories] = useState(view.categories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [dragItem, setDragItem] = useState<
    { type: "category"; id: string } | { type: "activity"; id: string } | null
  >(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const canEditList = view.week.status === "active" || view.week.status === "draft";
  const title =
    view.week.status === "draft" ? "Edit next week’s list" : "Edit this week’s list";
  const categories = useMemo(
    () =>
      listCategories.map((category) => ({
        name: category.name,
        sortOrder: category.sortOrder,
      })),
    [listCategories],
  );

  useEffect(() => {
    setListCategories(view.categories);
  }, [view.categories]);

  useEffect(() => {
    if (!dragItem) {
      return;
    }

    const currentDragItem = dragItem;

    function getDropTarget(event: PointerEvent) {
      const element = document.elementFromPoint(event.clientX, event.clientY);

      if (currentDragItem.type === "category") {
        return element?.closest<HTMLElement>("[data-week-list-category]")?.dataset
          .weekListCategory;
      }

      return element?.closest<HTMLElement>("[data-week-list-activity]")?.dataset
        .weekListActivity;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      setDragOverId(getDropTarget(event) ?? null);
    }

    function handlePointerUp(event: PointerEvent) {
      const targetId = getDropTarget(event);
      setDragItem(null);
      setDragOverId(null);

      if (!targetId || targetId === currentDragItem.id) {
        return;
      }

      setSaveError(null);
      const previousCategories = listCategories;
      const nextCategories =
        currentDragItem.type === "category"
          ? moveCategory(listCategories, currentDragItem.id, targetId)
          : moveActivity(listCategories, currentDragItem.id, targetId);

      if (!nextCategories) {
        return;
      }

      setListCategories(nextCategories);
      startTransition(() => {
        const result =
          currentDragItem.type === "category"
            ? reorderWeekCategoriesAction({
                weekId: view.week.id,
                categoryName: currentDragItem.id,
                targetCategoryName: targetId,
              })
            : reorderWeekActivitiesAction({
                weekActivityId: currentDragItem.id,
                targetWeekActivityId: targetId,
              });

        void result
          .then((response) => {
            if (response.status !== "updated") {
              setSaveError(
                "message" in response
                  ? (response.message ??
                      "That order could not be saved just now. Try again.")
                  : "That order could not be saved just now. Try again.",
              );
              setListCategories(previousCategories);
              return;
            }
          })
          .catch(() => {
            setSaveError("That order could not be saved just now. Try again.");
            setListCategories(previousCategories);
          });
      });
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragItem, listCategories, view.week.id]);

  if (!canEditList) {
    return null;
  }

  return (
    <details className="rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft">
      <summary className="cursor-pointer text-sm font-semibold text-clay">
        {title}
      </summary>
      <div className="mt-3 space-y-2">
        {saveError ? (
          <p
            role="alert"
            className="rounded-lg border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-stone-800"
          >
            {saveError}
          </p>
        ) : null}
        {listCategories.map((category) => (
          <section
            key={category.name}
            data-week-list-category={category.name}
            className={`overflow-hidden rounded-lg border bg-white transition ${
              dragOverId === category.name
                ? "border-clay shadow-soft"
                : "border-stone-200"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-stone-200 bg-paper px-3 py-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-clay">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Drag ${category.name} category`}
                  className="mr-1 inline-flex cursor-grab touch-none select-none text-stone-400 active:cursor-grabbing"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setDragItem({ type: "category", id: category.name });
                  }}
                >
                  ⋮⋮
                </span>
                {category.name}
              </h2>
              <span className="text-xs text-stone-500">Drag to reorder</span>
            </div>
            <div className="divide-y divide-stone-200">
              {category.activities.map((activity) => (
                <div
                  key={activity.id}
                  data-week-list-activity={activity.id}
                  className={`p-2 transition ${
                    dragOverId === activity.id ? "bg-mist/35" : ""
                  }`}
                >
                  {editingId === activity.id ? (
                    <ActivityEditForm
                      activity={activity}
                      categories={categories}
                      action={updateWeekActivityListItemAction}
                      onCancel={() => setEditingId(null)}
                      extraFields={
                        <input type="hidden" name="weekActivityId" value={activity.id} />
                      }
                      removeForm={
                        <form action={removeWeekActivityFromFutureAction}>
                          <input
                            type="hidden"
                            name="weekActivityId"
                            value={activity.id}
                          />
                          <button type="submit" className={secondaryButtonClassName}>
                            Remove from future weeks
                          </button>
                        </form>
                      }
                    />
                  ) : (
                    <ActivitySummaryRow
                      activity={activity}
                      onStartDrag={() =>
                        setDragItem({ type: "activity", id: activity.id })
                      }
                      onEdit={() => {
                        setIsAdding(false);
                        setEditingId(activity.id);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {isAdding ? (
          <div className="rounded-lg border border-stone-200 bg-paper p-3">
            <ActivityEditForm
              categories={categories}
              action={addWeekActivityListItemAction}
              onCancel={() => setIsAdding(false)}
              extraFields={<input type="hidden" name="weekId" value={view.week.id} />}
            />
          </div>
        ) : (
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={() => {
              setEditingId(null);
              setIsAdding(true);
            }}
          >
            + Add activity
          </button>
        )}
      </div>
    </details>
  );
}

function ActivitySummaryRow({
  activity,
  onStartDrag,
  onEdit,
}: {
  activity: WeekGridActivity;
  onStartDrag: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 text-sm sm:grid-cols-[1.2fr_1fr_auto_auto] sm:items-center">
      <div className="font-semibold text-ink">
        <span
          role="button"
          tabIndex={0}
          aria-label={`Drag ${activity.activityName}`}
          className="mr-1 inline-flex cursor-grab touch-none select-none text-stone-400 active:cursor-grabbing"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onStartDrag();
          }}
        >
          ⋮⋮
        </span>
        {activity.activityName}
      </div>
      <div className="text-stone-600 sm:col-auto">{activity.categoryName}</div>
      <div className="text-stone-700">{activity.targetCount}/wk</div>
      <button
        type="button"
        className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-clay transition hover:border-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
        onClick={onEdit}
      >
        Edit
      </button>
    </div>
  );
}

function ActivityEditForm({
  activity,
  categories,
  action,
  extraFields,
  removeForm,
  onCancel,
}: {
  activity?: WeekGridActivity;
  categories: { name: string; sortOrder: number }[];
  action: (formData: FormData) => Promise<void>;
  extraFields: ReactNode;
  removeForm?: ReactNode;
  onCancel: () => void;
}) {
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [selectedCategory, setSelectedCategory] = useState(
    activity?.categoryName ?? categories[0]?.name ?? "",
  );

  return (
    <form action={action} className="space-y-3">
      {extraFields}
      <label className={fieldLabelClassName}>
        Activity name
        <input
          className={textInputClassName}
          name="activityName"
          defaultValue={activity?.activityName ?? ""}
          required
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <label className={fieldLabelClassName}>
          Category
          <select
            className={textInputClassName}
            value={categoryMode === "new" ? "__new" : selectedCategory}
            onChange={(event) => {
              if (event.target.value === "__new") {
                setCategoryMode("new");
                return;
              }

              setCategoryMode("existing");
              setSelectedCategory(event.target.value);
            }}
          >
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
            <option value="__new">New category</option>
          </select>
        </label>
        {categoryMode === "new" ? (
          <label className={fieldLabelClassName}>
            New category
            <input className={textInputClassName} name="categoryName" required />
          </label>
        ) : (
          <input type="hidden" name="categoryName" value={selectedCategory} />
        )}
      </div>

      <label className={fieldLabelClassName}>
        Weekly target
        <input
          className={textInputClassName}
          name="targetCount"
          type="number"
          min="0"
          step="1"
          defaultValue={activity?.targetCount ?? 1}
          required
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className={primaryButtonClassName}>
          Save
        </button>
        <button type="button" className={secondaryButtonClassName} onClick={onCancel}>
          Cancel
        </button>
        {removeForm}
      </div>
    </form>
  );
}

function moveCategory(
  categories: WeekListCategory[],
  categoryName: string,
  targetCategoryName: string,
) {
  const fromIndex = categories.findIndex((category) => category.name === categoryName);
  const targetIndex = categories.findIndex(
    (category) => category.name === targetCategoryName,
  );

  if (fromIndex < 0 || targetIndex < 0) {
    return null;
  }

  const next = [...categories];
  const [category] = next.splice(fromIndex, 1);
  const nextTargetIndex = next.findIndex(
    (candidate) => candidate.name === targetCategoryName,
  );
  next.splice(nextTargetIndex, 0, category);

  return next;
}

function moveActivity(
  categories: WeekListCategory[],
  activityId: string,
  targetActivityId: string,
) {
  const next = categories.map((category) => ({
    ...category,
    activities: [...category.activities],
  }));
  const sourceCategory = next.find((category) =>
    category.activities.some((activity) => activity.id === activityId),
  );
  const targetCategory = next.find((category) =>
    category.activities.some((activity) => activity.id === targetActivityId),
  );

  if (!sourceCategory || !targetCategory) {
    return null;
  }

  const sourceIndex = sourceCategory.activities.findIndex(
    (activity) => activity.id === activityId,
  );
  const targetIndex = targetCategory.activities.findIndex(
    (activity) => activity.id === targetActivityId,
  );

  if (sourceIndex < 0 || targetIndex < 0) {
    return null;
  }

  const [activity] = sourceCategory.activities.splice(sourceIndex, 1);
  const nextTargetIndex =
    sourceCategory.name === targetCategory.name && sourceIndex < targetIndex
      ? targetIndex - 1
      : targetIndex;
  targetCategory.activities.splice(nextTargetIndex, 0, {
    ...activity,
    categoryName: targetCategory.name,
    categorySortOrder: targetCategory.sortOrder,
  });

  return next;
}

const fieldLabelClassName =
  "block text-xs font-semibold uppercase tracking-wide text-clay";

const textInputClassName =
  "mt-1 min-h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/20";

const primaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-meadow px-4 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow disabled:opacity-50";

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-clay/40 bg-white px-4 text-sm font-semibold text-clay transition hover:border-clay hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-clay";
