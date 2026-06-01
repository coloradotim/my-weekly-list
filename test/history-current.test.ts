import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHistoryPatterns,
  buildHistoryState,
  getHistoryPatternLine,
  getHistoryTargetSummaryLine,
  getHistoryWeekSummaryLine,
  summarizeHistoryWeek,
} from "@/lib/history/current";

const historyPage = readFileSync(
  join(process.cwd(), "app/(app)/history/page.tsx"),
  "utf8",
);
const reviewClient = readFileSync(
  join(process.cwd(), "components/optimistic-review-view.tsx"),
  "utf8",
);
const historyModel = readFileSync(join(process.cwd(), "lib/history/current.ts"), "utf8");

describe("History model", () => {
  it("summarizes last week with completed activity-days and target counts", () => {
    const summary = summarizeHistoryWeek(historyWeek("2026-05-25"));

    expect(summary).toMatchObject({
      weekStartDate: "2026-05-25",
      weekEndDate: "2026-05-31",
      rangeLabel: "May 25–31",
      completedActivityDays: 6,
      targetsMetCount: 2,
      shortOfTargetCount: 1,
      reviewHref: "/review?weekStart=2026-05-25",
    });
    expect(getHistoryWeekSummaryLine(summary)).toBe("6 activities completed");
    expect(getHistoryTargetSummaryLine(summary)).toBe(
      "2 targets met · 1 short of target",
    );
  });

  it("shows last week first and previous recorded weeks newest first", () => {
    const state = buildHistoryState({
      today: "2026-06-01",
      currentWeekStartDate: "2026-06-01",
      weeks: [
        historyWeek("2026-05-11"),
        historyWeek("2026-05-25"),
        historyWeek("2026-05-18"),
      ],
    });

    expect(state.lastWeek?.weekStartDate).toBe("2026-05-25");
    expect(state.previousWeeks.map((week) => week.weekStartDate)).toEqual([
      "2026-05-18",
      "2026-05-11",
    ]);
  });

  it("does not invent last week when the immediately previous week was not recorded", () => {
    const state = buildHistoryState({
      today: "2026-06-01",
      currentWeekStartDate: "2026-06-01",
      weeks: [historyWeek("2026-05-18"), historyWeek("2026-05-11")],
    });

    expect(state.lastWeek).toBeNull();
    expect(state.previousWeeks.map((week) => week.weekStartDate)).toEqual([
      "2026-05-18",
      "2026-05-11",
    ]);
  });

  it("builds pattern rows from the last four ended recorded weeks only", () => {
    const state = buildHistoryState({
      today: "2026-06-03",
      currentWeekStartDate: "2026-06-01",
      weeks: [
        historyWeek("2026-06-01"),
        historyWeek("2026-05-25"),
        historyWeek("2026-05-18", { readAbsent: true }),
        historyWeek("2026-05-11"),
        historyWeek("2026-05-04"),
        historyWeek("2026-04-27", { walkDoneDates: ["2026-04-27"] }),
      ],
    });

    const walk = state.patterns.find((pattern) => pattern.activityName === "Walk");
    const read = state.patterns.find((pattern) => pattern.activityName === "Read");

    expect(state.patterns.map((pattern) => pattern.activityName)).toContain("Walk");
    expect(walk).toMatchObject({
      completedDays: 12,
      targetMetWeeks: 4,
      includedWeeks: 4,
    });
    expect(read).toMatchObject({
      completedDays: 6,
      targetMetWeeks: 3,
      includedWeeks: 3,
    });
    expect(getHistoryPatternLine(walk!)).toBe("12 days · target met 4 of 4 weeks");
  });

  it("orders patterns by the latest included week snapshot instead of performance", () => {
    const patterns = buildHistoryPatterns([
      historyWeek("2026-05-25", {
        readAbsent: true,
        walkDoneDates: ["2026-05-25"],
        yogaDoneDates: ["2026-05-25", "2026-05-26"],
      }),
      historyWeek("2026-05-18", { onlyJournal: true }),
    ]);

    expect(patterns.map((pattern) => pattern.activityName)).toEqual([
      "Walk",
      "Yoga",
      "Journal",
    ]);
  });
});

describe("History implementation guardrails", () => {
  it("adds History as a secondary Review action without adding primary nav", () => {
    expect(reviewClient).toContain('href="/history"');
    expect(reviewClient).toContain("History");
    expect(reviewClient).toContain("Back to History");
    expect(reviewClient).toContain("Current week");
    expect(historyPage).toContain("loadHistory");
    expect(historyPage).toContain("Back to current week");
    expect(historyPage).toContain("Open review");
  });

  it("uses real recorded weeks and existing Review handoff links", () => {
    expect(historyModel).toContain('.from("weeks")');
    expect(historyModel).toContain('.lt("week_start_date", currentWeekStartDate)');
    expect(historyModel).toContain("activity_day_cells");
    expect(historyModel).toContain("activity_template_id");
    expect(historyModel).toContain("weekStart=");
    expect(historyPage).not.toContain("score");
    expect(historyPage).not.toContain("streak");
    expect(historyPage).not.toContain("%");
    expect(historyPage).not.toContain("category rollup");
  });
});

function historyWeek(
  weekStartDate: string,
  options: {
    readAbsent?: boolean;
    onlyJournal?: boolean;
    walkDoneDates?: string[];
    yogaDoneDates?: string[];
  } = {},
) {
  const date = new Date(`${weekStartDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  const weekEndDate = date.toISOString().slice(0, 10);

  return {
    id: `week-${weekStartDate}`,
    weekStartDate,
    weekEndDate,
    status: "active",
    activities: options.onlyJournal
      ? [
          {
            id: `journal-${weekStartDate}`,
            activityTemplateId: "template-journal",
            categoryName: "Mental Health",
            categorySortOrder: 1,
            activityName: "Journal",
            targetCount: 1,
            sortOrder: 1,
            doneDates: [weekStartDate],
          },
        ]
      : [
          {
            id: `walk-${weekStartDate}`,
            activityTemplateId: "template-walk",
            categoryName: "Physical Health",
            categorySortOrder: 0,
            activityName: "Walk",
            targetCount: 3,
            sortOrder: 0,
            doneDates:
              options.walkDoneDates ??
              [0, 2, 4].map((offset) => addDateDays(weekStartDate, offset)),
          },
          {
            id: `yoga-${weekStartDate}`,
            activityTemplateId: "template-yoga",
            categoryName: "Physical Health",
            categorySortOrder: 0,
            activityName: "Yoga",
            targetCount: 2,
            sortOrder: 1,
            doneDates: options.yogaDoneDates ?? [addDateDays(weekStartDate, 1)],
          },
          ...(options.readAbsent
            ? []
            : [
                {
                  id: `read-${weekStartDate}`,
                  activityTemplateId: "template-read",
                  categoryName: "Mental Health",
                  categorySortOrder: 1,
                  activityName: "Read",
                  targetCount: 2,
                  sortOrder: 0,
                  doneDates: [
                    addDateDays(weekStartDate, 0),
                    addDateDays(weekStartDate, 1),
                  ],
                },
              ]),
        ],
  } as const;
}

function addDateDays(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
