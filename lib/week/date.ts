export type DateOnly = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type WeekRelation = "past" | "current" | "future";

export function parseDateOnly(date: DateOnly) {
  if (!ISO_DATE_PATTERN.test(date)) {
    throw new Error(`Expected date-only string in YYYY-MM-DD format: ${date}`);
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date-only value: ${date}`);
  }

  return parsed;
}

export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: DateOnly, days: number) {
  const parsed = parseDateOnly(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return toDateOnly(parsed);
}

export function compareDateOnly(left: DateOnly, right: DateOnly) {
  const leftTime = parseDateOnly(left).getTime();
  const rightTime = parseDateOnly(right).getTime();

  if (leftTime === rightTime) {
    return 0;
  }

  return leftTime < rightTime ? -1 : 1;
}

export function daysBetween(startDate: DateOnly, endDate: DateOnly) {
  const startTime = parseDateOnly(startDate).getTime();
  const endTime = parseDateOnly(endDate).getTime();
  return Math.round((endTime - startTime) / MS_PER_DAY);
}

export function getWeekStartDate(date: DateOnly) {
  const parsed = parseDateOnly(date);
  const dayOfWeek = parsed.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - daysSinceMonday);
  return toDateOnly(parsed);
}

export function getWeekEndDate(weekStartDate: DateOnly) {
  const start = getWeekStartDate(weekStartDate);
  return addDays(start, 6);
}

export function getWeekRange(date: DateOnly) {
  const weekStartDate = getWeekStartDate(date);

  return {
    weekStartDate,
    weekEndDate: getWeekEndDate(weekStartDate),
  };
}

export function isMonday(date: DateOnly) {
  return parseDateOnly(date).getUTCDay() === 1;
}

export function isSunday(date: DateOnly) {
  return parseDateOnly(date).getUTCDay() === 0;
}

export function getWeekRelation(weekStartDate: DateOnly, today: DateOnly): WeekRelation {
  const normalizedWeekStart = getWeekStartDate(weekStartDate);
  const currentWeekStart = getWeekStartDate(today);

  if (normalizedWeekStart === currentWeekStart) {
    return "current";
  }

  return compareDateOnly(normalizedWeekStart, currentWeekStart) < 0 ? "past" : "future";
}

export function maxDateOnly(left: DateOnly, right: DateOnly) {
  return compareDateOnly(left, right) >= 0 ? left : right;
}
