import { describe, expect, it } from "vitest";
import {
  addDays,
  compareDateOnly,
  daysBetween,
  getDateOnlyForTimeZone,
  getWeekEndDate,
  getWeekRange,
  getWeekRelation,
  getWeekStartDate,
  isMonday,
  isSunday,
  parseDateOnly,
  toDateOnly,
} from "@/lib/week/date";

describe("week date helpers", () => {
  it("identifies Monday starts and Sunday ends for a normal week", () => {
    expect(getWeekStartDate("2026-05-28")).toBe("2026-05-25");
    expect(getWeekEndDate("2026-05-25")).toBe("2026-05-31");
    expect(getWeekRange("2026-05-28")).toEqual({
      weekStartDate: "2026-05-25",
      weekEndDate: "2026-05-31",
    });
  });

  it("keeps Sunday in the active Monday-Sunday week", () => {
    expect(getWeekStartDate("2026-05-31")).toBe("2026-05-25");
    expect(getWeekEndDate("2026-05-31")).toBe("2026-05-31");
    expect(isSunday("2026-05-31")).toBe(true);
    expect(isMonday("2026-05-31")).toBe(false);
  });

  it("detects Monday", () => {
    expect(isMonday("2026-06-01")).toBe(true);
    expect(isSunday("2026-06-01")).toBe(false);
  });

  it("handles month and year boundary weeks", () => {
    expect(getWeekRange("2026-01-01")).toEqual({
      weekStartDate: "2025-12-29",
      weekEndDate: "2026-01-04",
    });
    expect(getWeekRange("2024-12-31")).toEqual({
      weekStartDate: "2024-12-30",
      weekEndDate: "2025-01-05",
    });
  });

  it("classifies week relation relative to today", () => {
    expect(getWeekRelation("2026-05-18", "2026-05-28")).toBe("past");
    expect(getWeekRelation("2026-05-25", "2026-05-28")).toBe("current");
    expect(getWeekRelation("2026-06-01", "2026-05-28")).toBe("future");
  });

  it("uses date-only UTC math so local timezone offsets do not shift days", () => {
    expect(toDateOnly(parseDateOnly("2026-03-08"))).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(daysBetween("2026-03-08", "2026-03-09")).toBe(1);
  });

  it("derives today in the app timezone instead of the server timezone", () => {
    expect(
      getDateOnlyForTimeZone(new Date("2026-05-29T03:30:00.000Z"), "America/Denver"),
    ).toBe("2026-05-28");
  });

  it("compares valid date-only values and rejects malformed dates", () => {
    expect(compareDateOnly("2026-05-28", "2026-05-29")).toBe(-1);
    expect(compareDateOnly("2026-05-29", "2026-05-28")).toBe(1);
    expect(compareDateOnly("2026-05-28", "2026-05-28")).toBe(0);
    expect(() => parseDateOnly("2026-02-30")).toThrow("Invalid date-only value");
    expect(() => parseDateOnly("2026-5-28")).toThrow("Expected date-only string");
  });
});
