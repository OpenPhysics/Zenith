/**
 * civilDateTime.test.ts
 */
import { describe, expect, it } from "vitest";
import { civilPartsToTimeMs, civilTimeMsToParts, daysInUtcMonth } from "../src/common/sky/civilDateTime.js";

describe("daysInUtcMonth", () => {
  it("handles February in common and leap years", () => {
    expect(daysInUtcMonth(2023, 2)).toBe(28);
    expect(daysInUtcMonth(2024, 2)).toBe(29);
  });

  it("returns 30 or 31 for other months", () => {
    expect(daysInUtcMonth(2024, 1)).toBe(31);
    expect(daysInUtcMonth(2024, 4)).toBe(30);
  });
});

describe("civilTimeMsToParts / civilPartsToTimeMs", () => {
  it("round-trips a known UTC epoch", () => {
    const ms = Date.UTC(2024, 5, 21, 18, 0, 0);
    const parts = civilTimeMsToParts(ms);
    expect(parts).toEqual({ year: 2024, month: 6, day: 21, hour: 18 });
    expect(civilPartsToTimeMs(parts)).toBe(ms);
  });

  it("clamps day when the month is shorter", () => {
    expect(civilPartsToTimeMs({ year: 2023, month: 2, day: 31, hour: 12 })).toBe(Date.UTC(2023, 1, 28, 12, 0, 0));
  });
});
