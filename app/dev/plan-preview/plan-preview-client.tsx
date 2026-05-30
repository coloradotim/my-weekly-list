"use client";

import { useEffect, useMemo, useState } from "react";
import { ThisWeekGrid } from "@/components/this-week-grid";
import {
  activeDraftActivities,
  applyPlanPreviewAction,
  getDraftCategoryOptions,
  getInitialPlanPreviewState,
  removedDraftActivities,
  summarizeCopy,
  type PlanPreviewActivity,
  type PlanPreviewScenario,
  type PlanPreviewWeek,
} from "@/lib/plan/preview";
import {
  buildThisWeekViewModel,
  type PersistedWeekActivity,
  type ThisWeekViewModel,
} from "@/lib/week/current";
import type { DateOnly } from "@/lib/week/date";

const scenarios: { id: PlanPreviewScenario; label: string }[] = [
  { id: "sunday", label: "Sunday" },
  { id: "monday", label: "Monday" },
  { id: "return", label: "Tuesday return" },
];

export function PlanPreviewClient() {
  const [scenario, setScenario] = useState<PlanPreviewScenario>("sunday");
  const [state, setState] = useState(() => getInitialPlanPreviewState("sunday"));
  const [selectedWeek, setSelectedWeek] = useState<"current" | "draft">("current");
  const activeWeek = state.lateCurrentWeek ?? state.currentWeek;
  const visibleDraft = selectedWeek === "draft" ? state.draftWeek : null;
  const copySummary = summarizeCopy(visibleDraft ?? state.lateCurrentWeek);

  useEffect(() => {
    const hash = window.location.hash;

    if (hash === "#draft") {
      setState((current) => applyPlanPreviewAction(current, { type: "create-draft" }));
      setSelectedWeek("draft");
      return;
    }

    if (hash === "#edit") {
      setState((current) => {
        const draft = applyPlanPreviewAction(current, { type: "create-draft" });
        const edited = applyPlanPreviewAction(draft, {
          type: "edit-draft-activity",
          activityId: "draft-template-walk",
          activityName: "Morning walk",
          categoryName: "Physical Health",
          targetCount: 5,
        });
        const addedExisting = applyPlanPreviewAction(edited, {
          type: "add-draft-activity",
          activityName: "Pickleball",
          categoryName: "Hobbies",
          targetCount: 1,
        });
        const addedNewCategory = applyPlanPreviewAction(addedExisting, {
          type: "add-draft-activity",
          activityName: "Meal prep",
          categoryName: "Food",
          targetCount: 2,
        });
        return applyPlanPreviewAction(addedNewCategory, {
          type: "remove-draft-activity",
          activityId: "draft-template-read",
        });
      });
      setSelectedWeek("draft");
      return;
    }

    if (hash === "#monday") {
      setScenario("monday");
      setState(getInitialPlanPreviewState("monday"));
      setSelectedWeek("current");
      return;
    }

    if (hash === "#return" || hash === "#late" || hash === "#gap") {
      setScenario("return");
      setState(getInitialPlanPreviewState("return"));
      setSelectedWeek("current");
    }
  }, []);

  function selectScenario(nextScenario: PlanPreviewScenario) {
    setScenario(nextScenario);
    setState(getInitialPlanPreviewState(nextScenario));
    setSelectedWeek("current");
  }

  function dispatch(action: Parameters<typeof applyPlanPreviewAction>[1]) {
    setState((current) => applyPlanPreviewAction(current, action));
  }

  function createDraft() {
    dispatch({ type: "create-draft" });
    setSelectedWeek("draft");
  }

  function selectWeek(nextWeek: "current" | "draft") {
    if (nextWeek === "draft") {
      createDraft();
      return;
    }

    setSelectedWeek("current");
  }

  return (
    <div className="space-y-3">
      <ScenarioTabs scenario={scenario} onSelect={selectScenario} />

      {state.scenario === "sunday" ? (
        <SundayContext
          sourceWeek={state.sourceWeek}
          selectedWeek={selectedWeek}
          onSelectWeek={selectWeek}
        />
      ) : null}

      {state.scenario === "monday" ? (
        <MondayContext hasCurrentWeek={Boolean(state.currentWeek)} />
      ) : null}

      {state.scenario === "return" ? (
        <ReturnContext sourceWeek={state.sourceWeek} />
      ) : null}

      {visibleDraft ? (
        <section className="space-y-3">
          <CopySummary summary={copySummary} />
          <DraftListEditor
            week={visibleDraft}
            today={state.today}
            eyebrow="Next week"
            title="Edit next week’s list"
            showGridPreview
            onEdit={(activityId, activityName, categoryName, targetCount) =>
              dispatch({
                type: "edit-draft-activity",
                activityId,
                activityName,
                categoryName,
                targetCount,
              })
            }
            onRemove={(activityId) =>
              dispatch({ type: "remove-draft-activity", activityId })
            }
            onRestore={(activityId) =>
              dispatch({ type: "restore-draft-activity", activityId })
            }
            onAdd={(activityName, categoryName, targetCount) =>
              dispatch({
                type: "add-draft-activity",
                activityName,
                categoryName,
                targetCount,
              })
            }
            onReorderCategory={(categoryName, targetCategoryName) =>
              dispatch({
                type: "reorder-draft-category",
                categoryName,
                targetCategoryName,
              })
            }
            onReorderActivity={(activityId, targetActivityId) =>
              dispatch({
                type: "reorder-draft-activity",
                activityId,
                targetActivityId,
              })
            }
          />
        </section>
      ) : activeWeek ? (
        <section className="space-y-3">
          {state.lateCurrentWeek ? <CopySummary summary={copySummary} /> : null}
          <CurrentWeekGridPreview
            week={activeWeek}
            today={state.today}
            onTogglePlan={(activityId, date) =>
              dispatch({ type: "toggle-current-plan", activityId, date })
            }
            onEdit={(activityId, activityName, categoryName, targetCount) =>
              dispatch({
                type: "edit-current-activity",
                activityId,
                activityName,
                categoryName,
                targetCount,
              })
            }
            onRemove={(activityId) =>
              dispatch({ type: "remove-current-activity", activityId })
            }
            onRestore={(activityId) =>
              dispatch({ type: "restore-current-activity", activityId })
            }
            onAdd={(activityName, categoryName, targetCount) =>
              dispatch({
                type: "add-current-activity",
                activityName,
                categoryName,
                targetCount,
              })
            }
            onReorderCategory={(categoryName, targetCategoryName) =>
              dispatch({
                type: "reorder-current-category",
                categoryName,
                targetCategoryName,
              })
            }
            onReorderActivity={(activityId, targetActivityId) =>
              dispatch({
                type: "reorder-current-activity",
                activityId,
                targetActivityId,
              })
            }
          />
        </section>
      ) : (
        <SourceWeekSnapshot week={state.sourceWeek} />
      )}
    </div>
  );
}

function ScenarioTabs({
  scenario,
  onSelect,
}: {
  scenario: PlanPreviewScenario;
  onSelect: (scenario: PlanPreviewScenario) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft">
      {scenarios.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
            scenario === item.id
              ? "border-meadow bg-meadow text-white"
              : "border-stone-200 bg-white text-stone-700 hover:bg-paper"
          }`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function SundayContext({
  sourceWeek,
  selectedWeek,
  onSelectWeek,
}: {
  sourceWeek: PlanPreviewWeek;
  selectedWeek: "current" | "draft";
  onSelectWeek: (week: "current" | "draft") => void;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2 rounded-full border border-stone-200 bg-paper p-1">
          <button
            type="button"
            className={viewToggleClassName(selectedWeek === "current")}
            onClick={() => onSelectWeek("current")}
          >
            This week
          </button>
          <button
            type="button"
            className={viewToggleClassName(selectedWeek === "draft")}
            onClick={() => onSelectWeek("draft")}
          >
            Next week
          </button>
        </div>
        <span className={sourcePillClassName}>
          Copies this week’s list: {formatDateRange(sourceWeek)}
        </span>
      </div>
    </section>
  );
}

function MondayContext({ hasCurrentWeek }: { hasCurrentWeek: boolean }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft sm:p-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-clay">
        Monday, June 8
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
        The prepared Draft is now this week.
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        Monday opens the normal Week grid. The copied list is active with a blank plan,
        without a separate done or finalize button.
      </p>
      {hasCurrentWeek ? (
        <p className="mt-3 rounded-lg border border-meadow/30 bg-meadow/10 px-3 py-2 text-sm font-semibold text-stone-700">
          Current week is active.
        </p>
      ) : null}
    </section>
  );
}

function CurrentWeekGridPreview({
  week,
  today,
  onTogglePlan,
  onEdit,
  onRemove,
  onRestore,
  onAdd,
  onReorderCategory,
  onReorderActivity,
}: {
  week: PlanPreviewWeek;
  today: DateOnly;
  onTogglePlan: (activityId: string, date: DateOnly) => void;
  onEdit: (
    activityId: string,
    activityName: string,
    categoryName: string,
    targetCount: number,
  ) => void;
  onRemove: (activityId: string) => void;
  onRestore: (activityId: string) => void;
  onAdd: (activityName: string, categoryName: string, targetCount: number) => void;
  onReorderCategory: (categoryName: string, targetCategoryName: string) => void;
  onReorderActivity: (activityId: string, targetActivityId: string) => void;
}) {
  const gridView = toThisWeekViewModel({ week, today });

  return (
    <section className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-clay">
            {week.status === "active" ? "Week" : week.status}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
            {formatDateRange(week)}
          </h2>
        </div>
        <span className="rounded-full border border-stone-200 bg-paper px-3 py-1 text-sm font-semibold text-stone-700">
          {week.status === "active" ? "Current active week" : week.label}
        </span>
      </div>
      <ThisWeekGrid
        view={gridView}
        notice={null}
        showStatusPanel={false}
        renderPlanningControl={({ activity, cell, children, className, ariaLabel }) =>
          cell.isPlanningEditable ? (
            <button
              type="button"
              className={className}
              aria-label={ariaLabel}
              onClick={() => onTogglePlan(activity.id, cell.date)}
            >
              {children}
            </button>
          ) : (
            <div
              className={className.replace("cursor-pointer", "cursor-default")}
              aria-label={ariaLabel}
            >
              {children}
            </div>
          )
        }
      />
      <div className="mt-3">
        <DraftListEditor
          week={week}
          today={today}
          eyebrow="This week"
          title="Edit this week’s list"
          compact
          showGridPreview={false}
          onEdit={onEdit}
          onRemove={onRemove}
          onRestore={onRestore}
          onAdd={onAdd}
          onReorderCategory={onReorderCategory}
          onReorderActivity={onReorderActivity}
        />
      </div>
    </section>
  );
}

function ReturnContext({ sourceWeek }: { sourceWeek: PlanPreviewWeek }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft sm:p-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-clay">
        Tuesday return
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
        This week is already rolled forward.
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        If the app was not opened Sunday or Monday, Week still opens the current
        Monday-Sunday week from the most recent real list. Planned days are not copied, so
        elapsed days are not turned into missed history.
      </p>
      <p className={`${sourcePillClassName} mt-3`}>
        Source: {formatDateRange(sourceWeek)}
      </p>
    </section>
  );
}

function SourceWeekSnapshot({ week }: { week: PlanPreviewWeek }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white/80 p-3 shadow-soft sm:p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-clay">
            Copy source
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal text-ink">
            {week.label}
          </h2>
          <p className="text-sm text-stone-600">{formatDateRange(week)}</p>
        </div>
        <span className="rounded-full border border-stone-200 bg-paper px-3 py-1 text-sm font-semibold capitalize text-stone-700">
          {week.status}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {week.activities.map((activity) => (
          <SourceActivity key={activity.id} activity={activity} />
        ))}
      </div>
    </section>
  );
}

function SourceActivity({ activity }: { activity: PlanPreviewActivity }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white/75 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">{activity.activityName}</h3>
          <p className="text-sm text-stone-600">
            {activity.targetCount}/week · {activity.categoryName}
          </p>
        </div>
        <OutcomeCounts activity={activity} />
      </div>
    </article>
  );
}

function DraftListEditor({
  week,
  today,
  eyebrow,
  title,
  compact = false,
  showGridPreview = true,
  onEdit,
  onRemove,
  onRestore,
  onAdd,
  onReorderCategory,
  onReorderActivity,
}: {
  week: PlanPreviewWeek;
  today: DateOnly;
  eyebrow: string;
  title: string;
  compact?: boolean;
  showGridPreview?: boolean;
  onEdit: (
    activityId: string,
    activityName: string,
    categoryName: string,
    targetCount: number,
  ) => void;
  onRemove: (activityId: string) => void;
  onRestore: (activityId: string) => void;
  onAdd: (activityName: string, categoryName: string, targetCount: number) => void;
  onReorderCategory: (categoryName: string, targetCategoryName: string) => void;
  onReorderActivity: (activityId: string, targetActivityId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingCategoryName, setAddingCategoryName] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [localCategoryNames, setLocalCategoryNames] = useState<string[]>([]);
  const [dragItem, setDragItem] = useState<
    { type: "category"; id: string } | { type: "activity"; id: string } | null
  >(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [removedNotice, setRemovedNotice] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const activities = activeDraftActivities(week);
  const removedActivities = removedDraftActivities(week);
  const categories = useMemo(() => getDraftCategoryOptions(week), [week]);
  const categoryOptions = useMemo(
    () =>
      [
        ...categories,
        ...localCategoryNames
          .filter(
            (name) =>
              !categories.some(
                (category) => category.name.toLowerCase() === name.toLowerCase(),
              ),
          )
          .map((name, index) => ({
            name,
            sortOrder:
              Math.max(0, ...categories.map((category) => category.sortOrder)) +
              (index + 1) * 10,
          })),
      ].toSorted(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
      ),
    [categories, localCategoryNames],
  );
  const categoryGroups = useMemo(
    () =>
      categoryOptions.map((category) => ({
        ...category,
        activities: activities
          .filter((activity) => activity.categoryName === category.name)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      })),
    [activities, categoryOptions],
  );

  useEffect(() => {
    if (!dragItem) {
      return;
    }

    const currentDragItem = dragItem;

    function getDropTarget(event: PointerEvent) {
      const element = document.elementFromPoint(event.clientX, event.clientY);

      if (currentDragItem.type === "category") {
        return element?.closest<HTMLElement>("[data-plan-category]")?.dataset
          .planCategory;
      }

      return element?.closest<HTMLElement>("[data-plan-activity]")?.dataset.planActivity;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      setDragOverId(getDropTarget(event) ?? null);
    }

    function handlePointerUp(event: PointerEvent) {
      const targetId = getDropTarget(event);

      if (targetId && targetId !== currentDragItem.id) {
        if (currentDragItem.type === "category") {
          onReorderCategory(currentDragItem.id, targetId);
        } else {
          onReorderActivity(currentDragItem.id, targetId);
        }
      }

      setDragItem(null);
      setDragOverId(null);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragItem, onReorderActivity, onReorderCategory]);
  const gridView = toThisWeekViewModel({ week, today });

  return (
    <section
      className={
        compact ? "" : "rounded-lg border border-stone-200 bg-white/85 p-3 shadow-soft"
      }
    >
      {compact ? null : (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-clay">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
              {formatDateRange(week)}
            </h2>
          </div>
          <span className="rounded-full border border-stone-200 bg-paper px-3 py-1 text-sm font-semibold text-stone-700">
            {title}
          </span>
        </div>
      )}

      <details
        className={
          compact
            ? "rounded-lg border border-stone-200 bg-white/80 p-3"
            : "mt-3 rounded-lg border border-stone-200 bg-white/80 p-3"
        }
      >
        <summary className="cursor-pointer text-sm font-semibold text-clay">
          {title}
        </summary>
        <div className="mt-3 space-y-2">
          {categoryGroups.map((category) => (
            <section
              key={category.name}
              data-plan-category={category.name}
              className={`overflow-hidden rounded-lg border bg-white transition ${
                dragOverId === category.name
                  ? "border-clay shadow-soft"
                  : "border-stone-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-stone-200 bg-paper px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-clay">
                  <button
                    type="button"
                    aria-label={`Drag ${category.name} category`}
                    className="mr-1 inline-flex min-h-9 min-w-9 cursor-grab touch-none select-none items-center justify-center rounded-full text-lg leading-none text-stone-400 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDragItem({ type: "category", id: category.name });
                    }}
                  >
                    ⋮⋮
                  </button>
                  {category.name}
                </h3>
                <button
                  type="button"
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border border-clay/25 bg-white/80 px-2.5 text-xs font-semibold text-clay transition hover:border-clay hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-clay sm:px-3"
                  onClick={() => {
                    setEditingId(null);
                    setAddingCategoryName(category.name);
                  }}
                >
                  + Add
                </button>
              </div>
              <div className="divide-y divide-stone-200">
                {category.activities.map((activity) => (
                  <div
                    key={activity.id}
                    data-plan-activity={activity.id}
                    className={`p-2 transition ${
                      dragOverId === activity.id ? "bg-mist/35" : ""
                    }`}
                  >
                    {editingId === activity.id ? (
                      <ActivityEditForm
                        activity={activity}
                        categories={categoryOptions}
                        onCancel={() => setEditingId(null)}
                        onRemove={() => {
                          onRemove(activity.id);
                          setRemovedNotice({
                            id: activity.id,
                            name: activity.activityName,
                          });
                          setEditingId(null);
                        }}
                        onSave={(activityName, categoryName, targetCount) => {
                          onEdit(activity.id, activityName, categoryName, targetCount);
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      <ActivitySummaryRow
                        activity={activity}
                        onStartDrag={() =>
                          setDragItem({ type: "activity", id: activity.id })
                        }
                        onEdit={() => {
                          setAddingCategoryName(null);
                          setEditingId(activity.id);
                        }}
                      />
                    )}
                  </div>
                ))}
                {addingCategoryName === category.name ? (
                  <div className="bg-paper p-3">
                    <ActivityEditForm
                      categories={categoryOptions}
                      initialCategoryName={category.name}
                      onCancel={() => setAddingCategoryName(null)}
                      onSave={(activityName, categoryName, targetCount) => {
                        onAdd(activityName, categoryName, targetCount);
                        setAddingCategoryName(null);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        {isAddingCategory ? (
          <form
            className="mt-3 rounded-lg border border-stone-200 bg-paper p-3"
            onSubmit={(event) => {
              event.preventDefault();
              const categoryName = newCategoryName.trim();

              if (!categoryName) {
                return;
              }

              setLocalCategoryNames((current) =>
                current.some((name) => name.toLowerCase() === categoryName.toLowerCase())
                  ? current
                  : [...current, categoryName],
              );
              setAddingCategoryName(categoryName);
              setNewCategoryName("");
              setIsAddingCategory(false);
            }}
          >
            <label className={fieldLabelClassName}>
              Category name
              <input
                className={textInputClassName}
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                required
              />
            </label>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => {
                  setIsAddingCategory(false);
                  setNewCategoryName("");
                }}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButtonClassName}>
                Add category
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className={`${secondaryButtonClassName} mt-3`}
            onClick={() => {
              setEditingId(null);
              setAddingCategoryName(null);
              setIsAddingCategory(true);
            }}
          >
            + Add category
          </button>
        )}

        {removedActivities.length > 0 ? (
          <div className="mt-3 space-y-2">
            {removedNotice ? (
              <div
                role="status"
                className="rounded-lg border border-mist bg-mist/20 px-3 py-2 text-sm text-stone-700"
              >
                Removed {removedNotice.name}.{" "}
                <button
                  type="button"
                  className="font-semibold text-clay underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
                  onClick={() => {
                    onRestore(removedNotice.id);
                    setRemovedNotice(null);
                  }}
                >
                  Undo
                </button>
              </div>
            ) : null}
            <div className="rounded-lg bg-paper p-2 text-sm text-stone-600">
              Removed from future weeks:{" "}
              {removedActivities.map((activity) => activity.activityName).join(", ")}
            </div>
          </div>
        ) : null}
      </details>

      {showGridPreview ? (
        <details className="mt-3 rounded-lg border border-stone-200 bg-white/80 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-clay">
            Preview weekly grid
          </summary>
          <div className="mt-3">
            <ThisWeekGrid
              view={gridView}
              notice={null}
              showStatusPanel={false}
              renderPlanningControl={({ children, className, ariaLabel }) => (
                <div
                  className={className.replace("cursor-pointer", "cursor-default")}
                  aria-label={ariaLabel}
                >
                  {children}
                </div>
              )}
            />
          </div>
        </details>
      ) : null}
    </section>
  );
}

function ActivitySummaryRow({
  activity,
  onStartDrag,
  onEdit,
}: {
  activity: PlanPreviewActivity;
  onStartDrag: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-sm">
      <div className="flex min-w-0 items-center gap-1 font-semibold text-ink">
        <button
          type="button"
          aria-label={`Drag ${activity.activityName}`}
          className="inline-flex min-h-9 min-w-9 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-full text-lg leading-none text-stone-400 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onStartDrag();
          }}
        >
          ⋮⋮
        </button>
        <span className="min-w-0 truncate">{activity.activityName}</span>
      </div>
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
  initialCategoryName,
  onSave,
  onCancel,
  onRemove,
}: {
  activity?: PlanPreviewActivity;
  categories: { name: string; sortOrder: number }[];
  initialCategoryName?: string;
  onSave: (activityName: string, categoryName: string, targetCount: number) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const [activityName, setActivityName] = useState(activity?.activityName ?? "");
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [categoryName, setCategoryName] = useState(
    activity?.categoryName ?? initialCategoryName ?? categories[0]?.name ?? "",
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [targetCount, setTargetCount] = useState(activity?.targetCount ?? 1);
  const finalCategory =
    categoryMode === "new" ? newCategoryName.trim() : categoryName.trim();
  const categoryLabel = categoryMode === "new" ? "New category" : categoryName;
  const canSave = activityName.trim().length > 0 && finalCategory.length > 0;

  return (
    <div className="space-y-3">
      <label className={fieldLabelClassName}>
        Activity name
        <input
          className={textInputClassName}
          value={activityName}
          onChange={(event) => setActivityName(event.target.value)}
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
                    setCategoryName(category.name);
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
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center overflow-hidden rounded-full border border-stone-200 bg-white">
          <button
            type="button"
            className="min-h-10 px-4 text-sm font-semibold text-stone-600 disabled:opacity-40"
            disabled={targetCount <= 1}
            onClick={() => setTargetCount((value) => Math.max(1, value - 1))}
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

        <div className="flex flex-wrap gap-2">
          {onRemove ? (
            <button
              type="button"
              className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
              onClick={onRemove}
            >
              Remove from future weeks
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 transition hover:border-clay hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClassName}
            disabled={!canSave}
            onClick={() => onSave(activityName.trim(), finalCategory, targetCount)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function CopySummary({ summary }: { summary: ReturnType<typeof summarizeCopy> }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white/80 p-3 text-sm text-stone-700 shadow-soft">
      <span className="font-semibold text-ink">{summary.copiedActivities}</span>{" "}
      activities copied · <span className="font-semibold text-ink">blank plan</span> ·{" "}
      <span className="font-semibold text-ink">0</span> done ·{" "}
      <span className="font-semibold text-ink">0</span> skipped
    </section>
  );
}

function OutcomeCounts({ activity }: { activity: PlanPreviewActivity }) {
  const done = activity.cells.filter((cell) => cell.done).length;
  const skipped = activity.cells.filter((cell) => cell.skipped).length;

  return (
    <div className="shrink-0 text-right text-xs text-stone-600">
      <p>{done} done</p>
      <p>{skipped} skipped</p>
    </div>
  );
}

function toThisWeekViewModel({
  week,
  today,
}: {
  week: PlanPreviewWeek;
  today: DateOnly;
}): ThisWeekViewModel {
  return buildThisWeekViewModel({
    week: {
      id: week.id,
      status: week.status === "past" ? "closed" : week.status,
      weekStartDate: week.weekStartDate,
      weekEndDate: week.weekEndDate,
    },
    today,
    activities: week.activities.map(
      (activity): PersistedWeekActivity => ({
        id: activity.id,
        activityTemplateId: activity.templateId,
        categoryId: null,
        categoryName: activity.categoryName,
        categorySortOrder: activity.categorySortOrder,
        activityName: activity.activityName,
        targetCount: activity.targetCount,
        sortOrder: activity.sortOrder,
        cells: activity.cells.map((cell) => ({
          id: `${activity.id}-${cell.date}`,
          cellDate: cell.date,
          planned: cell.planned,
          done: cell.done,
          skipped: cell.skipped,
        })),
      }),
    ),
  });
}

function formatDateRange(week: PlanPreviewWeek) {
  return `${formatShortDate(week.weekStartDate)}-${formatShortDate(week.weekEndDate)}`;
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-meadow px-5 text-sm font-semibold text-white transition hover:bg-meadow/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow disabled:opacity-50";

const secondaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-clay/40 bg-white px-4 text-sm font-semibold text-clay transition hover:border-clay hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-clay";

const sourcePillClassName =
  "inline-block max-w-full basis-full whitespace-normal rounded-2xl border border-mist bg-mist/30 px-3 py-1 text-sm text-stone-700 sm:basis-auto";

function viewToggleClassName(isSelected: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
    isSelected ? "bg-meadow text-white" : "text-stone-700 hover:bg-white"
  }`;
}

const fieldLabelClassName =
  "block text-xs font-semibold uppercase tracking-wide text-clay";

const textInputClassName =
  "mt-1 min-h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/20";
