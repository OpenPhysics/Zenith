/**
 * civilDateTime.ts
 *
 * UTC civil date/time parts ↔ millisecond epoch helpers for the date jump UI.
 * Pure functions — no Scenery / model deps.
 */

export type CivilDateTimeParts = {
  year: number;
  /** Calendar month in 1–12. */
  month: number;
  /** Day of month in 1–31 (clamped to the month when converted to ms). */
  day: number;
  /** Hour of day in 0–23 (UTC). */
  hour: number;
};

/** Number of days in `month` (1–12) of `year` (UTC Gregorian). */
export const daysInUtcMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Split a UTC millisecond timestamp into civil year/month/day/hour. */
export const civilTimeMsToParts = (civilTimeMs: number): CivilDateTimeParts => {
  const date = new Date(civilTimeMs);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
  };
};

/**
 * Build a UTC millisecond timestamp from civil parts.
 * Day is clamped to the length of the given month (e.g. 31 → 28 in February).
 * Minutes/seconds are zeroed so the jump UI lands on whole hours.
 */
export const civilPartsToTimeMs = (parts: CivilDateTimeParts): number => {
  const day = Math.min(parts.day, daysInUtcMonth(parts.year, parts.month));
  return Date.UTC(parts.year, parts.month - 1, day, parts.hour, 0, 0);
};

/**
 * Local mean solar time (HH:MM) at the observer's longitude: civil UTC shifted
 * by longitude/15 hours — the clock the Sun keeps, so it explains why the sky
 * does not match the UTC readout.
 */
export const formatLocalSolarTime = (civilTimeMs: number, longitudeDeg: number): string => {
  const solar = new Date(civilTimeMs + (longitudeDeg / 15) * 3600 * 1000);
  const hh = String(solar.getUTCHours()).padStart(2, "0");
  const mm = String(solar.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};
