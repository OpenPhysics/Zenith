/**
 * zenithQueryParameters.test.ts
 *
 * Covers civil-date parsing helpers used by teacher deep-link query params.
 */

import { describe, expect, it } from "vitest";
import {
  isValidCivilDateQueryParam,
  parseCivilDateQueryParam,
  resolveCivilTimeMsFromQuery,
} from "../src/preferences/zenithQueryParameters.js";
import { DEFAULT_CIVIL_TIME_MS } from "../src/SimConstants.js";

describe("zenithQueryParameters date helpers", () => {
  it("treats empty or null date as the sim default civil epoch", () => {
    expect(isValidCivilDateQueryParam("")).toBe(true);
    expect(isValidCivilDateQueryParam(null)).toBe(true);
    expect(parseCivilDateQueryParam("")).toBeNull();
    expect(parseCivilDateQueryParam(null)).toBeNull();
    expect(resolveCivilTimeMsFromQuery("")).toBe(DEFAULT_CIVIL_TIME_MS);
    expect(resolveCivilTimeMsFromQuery(null)).toBe(DEFAULT_CIVIL_TIME_MS);
  });

  it("accepts ISO-8601 civil timestamps", () => {
    const iso = "2024-12-21T10:00:00Z";
    expect(isValidCivilDateQueryParam(iso)).toBe(true);
    expect(parseCivilDateQueryParam(iso)).toBe(Date.parse(iso));
    expect(resolveCivilTimeMsFromQuery(iso)).toBe(Date.UTC(2024, 11, 21, 10, 0, 0));
  });

  it("rejects unparseable date strings", () => {
    expect(isValidCivilDateQueryParam("not-a-date")).toBe(false);
    expect(parseCivilDateQueryParam("not-a-date")).toBeNull();
  });
});
