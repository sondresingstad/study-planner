/** Monday-based ISO week start, at local midnight. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift so Monday is the start
  d.setDate(d.getDate() + diff);
  return d;
}

export function isSameWeek(a: Date, b: Date): boolean {
  return getWeekStart(a).getTime() === getWeekStart(b).getTime();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** "Today" / "Tomorrow" / "Wed" / "Wed, Sep 3" (year included only if not the current year). */
export function formatRelativeDay(date: Date, now: Date = new Date()): string {
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, addDays(now, 1))) return "Tomorrow";
  if (isSameDay(date, addDays(now, -1))) return "Yesterday";

  const withinWeek = Math.abs(date.getTime() - now.getTime()) < 6 * 24 * 60 * 60 * 1000;
  if (withinWeek) return date.toLocaleDateString("en-US", { weekday: "short" });

  const includeYear = date.getFullYear() !== now.getFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
  });
}

/** ISO-like week number label, e.g. "Week 35". */
export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
