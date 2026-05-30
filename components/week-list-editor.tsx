"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addWeekActivityListItemAction,
  removeWeekActivityFromFutureClientAction,
  reorderWeekActivitiesAction,
  reorderWeekCategoriesAction,
  updateWeekActivityListItemAction,
} from "@/app/(app)/week/actions";
import type { ThisWeekViewModel, WeekGridActivity } from "@/lib/week/current";

type WeekListCategory = ThisWeekViewModel["categories"][number];

export function WeekListEditor({
  view,
  onCategoriesChange,
}: {
  view: ThisWeekViewModel;
  onCategoriesChange?: (categories: WeekListCategory[]) => void;
}) {
  const [listCategories, setListCategories] = useState(view.categories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [dragItem, setDragItem] = useState<
    { type: "category"; id: string } | { type: "activity"; id: string } | null
  >(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [collapsedCategoryNames, setCollapsedCategoryNames] = useState<string[]>([]);
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

  function toggleCategory(categoryName: string) {
    setCollapsedCategoryNames((current) =>
      current.includes(categoryName)
        ? current.filter((name) => name !== categoryName)
        : [...current, categoryName],
    );
  }

  function removeActivityFromList(activityId: string) {
    let removed = false;
    const nextCategories = listCategories
      .map((category) => ({
        ...category,
        activities: category.activities.filter((activity) => {
          if (activity.id === activityId) {
            removed = true;
            return false;
          }

          return true;
        }),
      }))
      .filter((category) => category.activities.length > 0);

    if (!removed) {
      return null;
    }

    return nextCategories;
  }

  function deleteActivity(activityId: string) {
    const previousCategories = listCategories;
    const nextCategories = removeActivityFromList(activityId);

    if (!nextCategories) {
      return;
    }

    setSaveError(null);
    setEditingId(null);
    setListCategories(nextCategories);
    onCategoriesChange?.(nextCategories);

    startTransition(() => {
      void removeWeekActivityFromFutureClientAction(activityId)
        .then((response) => {
          if (response.status !== "removed") {
            setSaveError(
              "message" in response
                ? (response.message ?? "That activity could not be deleted just now.")
                : "That activity could not be deleted just now.",
            );
            setListCategories(previousCategories);
            onCategoriesChange?.(previousCategories);
          }
        })
        .catch(() => {
          setSaveError("That activity could not be deleted just now. Try again.");
          setListCategories(previousCategories);
          onCategoriesChange?.(previousCategories);
        });
    });
  }

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
      onCategoriesChange?.(nextCategories);
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
              onCategoriesChange?.(previousCategories);
              return;
            }
          })
          .catch(() => {
            setSaveError("That order could not be saved just now. Try again.");
            setListCategories(previousCategories);
            onCategoriesChange?.(previousCategories);
          });
      });
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragItem, listCategories, onCategoriesChange, view.week.id]);

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
        {listCategories.map((category) => {
          const isCollapsed = collapsedCategoryNames.includes(category.name);

          return (
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
                <h2 className="flex min-w-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-clay">
                  <button
                    type="button"
                    className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${category.name}`}
                    onClick={() => toggleCategory(category.name)}
                  >
                    <span aria-hidden="true">{isCollapsed ? "▸" : "▾"}</span>
                  </button>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Drag ${category.name} category`}
                    className="mr-1 inline-flex cursor-grab touch-none select-none text-stone-400 active:cursor-grabbing"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDragItem({ type: "category", id: category.name });
                    }}
                  >
                    ⋮⋮
                  </span>
                  <span className="truncate">{category.name}</span>
                </h2>
                <span className="shrink-0 text-xs text-stone-500">
                  {isCollapsed
                    ? `${category.activities.length} ${
                        category.activities.length === 1 ? "activity" : "activities"
                      } hidden`
                    : "Drag to reorder"}
                </span>
              </div>
              {!isCollapsed ? (
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
                            <input
                              type="hidden"
                              name="weekActivityId"
                              value={activity.id}
                            />
                          }
                          onDelete={() => deleteActivity(activity.id)}
                          canDelete
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
              ) : null}
            </section>
          );
        })}

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
  canDelete = false,
  onDelete,
  onCancel,
}: {
  activity?: WeekGridActivity;
  categories: { name: string; sortOrder: number }[];
  action: (formData: FormData) => Promise<void>;
  extraFields: ReactNode;
  canDelete?: boolean;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [selectedCategory, setSelectedCategory] = useState(
    activity?.categoryName ?? categories[0]?.name ?? "",
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [targetCount, setTargetCount] = useState(activity?.targetCount ?? 1);
  const categoryLabel = categoryMode === "new" ? "New category" : selectedCategory;

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

      <div>
        <p className={fieldLabelClassName}>Category</p>
        <div className="relative mt-1">
          <button
            type="button"
            className={`${textInputClassName} flex items-center justify-between text-left`}
            aria-expanded={isCategoryOpen}
            onClick={() => setIsCategoryOpen((open) => !open)}
          >
            <span>{categoryLabel}</span>
            <span aria-hidden="true" className="text-stone-500">
              ▾
            </span>
          </button>
          {isCategoryOpen ? (
            <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-soft">
              {categories.map((category) => (
                <button
                  key={category.name}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm font-medium text-stone-700 transition hover:bg-paper focus:bg-paper focus:outline-none"
                  onClick={() => {
                    setCategoryMode("existing");
                    setSelectedCategory(category.name);
                    setIsCategoryOpen(false);
                  }}
                >
                  {category.name}
                </button>
              ))}
              <button
                type="button"
                className="block w-full border-t border-stone-200 px-3 py-2 text-left text-sm font-semibold text-clay transition hover:bg-paper focus:bg-paper focus:outline-none"
                onClick={() => {
                  setCategoryMode("new");
                  setIsCategoryOpen(false);
                }}
              >
                New category
              </button>
            </div>
          ) : null}
        </div>
        {categoryMode === "new" ? (
          <label className={fieldLabelClassName}>
            New category
            <input
              className={textInputClassName}
              name="categoryName"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              required
            />
          </label>
        ) : (
          <input type="hidden" name="categoryName" value={selectedCategory} />
        )}
      </div>

      <div>
        <p className={fieldLabelClassName}>Weekly target</p>
        <input type="hidden" name="targetCount" value={targetCount} />
        <div className="mt-1 flex w-fit items-center overflow-hidden rounded-full border border-stone-200 bg-white">
          <button
            type="button"
            className="min-h-10 px-4 text-sm font-semibold text-stone-600 disabled:opacity-40"
            disabled={targetCount <= 0}
            onClick={() => setTargetCount((value) => Math.max(0, value - 1))}
          >
            -
          </button>
          <span className="min-w-16 px-2 text-center text-sm font-semibold text-ink">
            {targetCount}/wk
          </span>
          <button
            type="button"
            className="min-h-10 px-4 text-sm font-semibold text-stone-600"
            onClick={() => setTargetCount((value) => value + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {canDelete ? (
            <button
              type="button"
              className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
              onClick={onDelete}
            >
              Delete
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButtonClassName} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClassName}>
            Save
          </button>
        </div>
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
  next.splice(
    fromIndex < targetIndex ? nextTargetIndex + 1 : nextTargetIndex,
    0,
    category,
  );

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
      ? targetIndex
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
