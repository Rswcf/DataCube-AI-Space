/**
 * Utility functions for handling both weekly (YYYY-kwWW) and daily (YYYY-MM-DD) period IDs.
 */

/** Check if a period ID is daily format (YYYY-MM-DD) */
export function isDailyId(id: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(id);
}

/** Check if a period ID is weekly format (YYYY-kwWW) */
export function isWeeklyId(id: string): boolean {
  return /^\d{4}-kw\d{2}$/.test(id);
}

/**
 * Get display label for a period ID.
 * Weekly: "KW 05" (DE) / "W 05" (EN)
 * Daily: "07.02." (DE) / "Feb 7" (EN)
 */
export function getPeriodLabel(id: string, language: string): string {
  if (isDailyId(id)) {
    const [year, month, day] = id.split("-").map(Number);
    if (language === "de") {
      return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.`;
    }
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  // Weekly format
  const weekNum = id.split("-kw")[1];
  return language === "de" ? `KW ${weekNum}` : `W ${weekNum}`;
}

/**
 * Format a period ID for use in page titles and metadata.
 * Weekly: "KW 05" (DE) / "Week 05" (EN)
 * Daily: "07.02.2026" (DE) / "Feb 7, 2026" (EN)
 */
export function formatPeriodTitle(id: string, language: string): string {
  if (isDailyId(id)) {
    const [year, month, day] = id.split("-").map(Number);
    if (language === "de") {
      return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  const weekNum = id.split("-kw")[1];
  return language === "de" ? `KW ${weekNum}` : `Week ${weekNum}`;
}

/**
 * Get the period number for badge display.
 * Weekly: week number (e.g., "05"). Daily: day of month (e.g., "07").
 */
export function getPeriodNum(id: string): string {
  if (isDailyId(id)) {
    return id.split("-")[2];
  }
  return id.split("-kw")[1];
}
