/**
 * objectSearch.test.ts
 *
 * Ranking heuristics for the type-ahead sky search. Covers prefix priority,
 * word-boundary vs mid-word matches, id fallback, accent/case insensitivity,
 * empty-query browsing, and the result limit.
 */

import { describe, expect, it } from "vitest";
import { normalizeSearchText, type ObjectSearchEntry, rankObjects } from "../src/zenith-screen/model/objectSearch.js";

const NAMES = [
  "Sun",
  "Moon",
  "Sirius",
  "Canopus",
  "Vega",
  "Capella",
  "Rigel",
  "Procyon",
  "Betelgeuse",
  "Altair",
  "Aldebaran",
  "Antares",
  "Spica",
  "Pollux",
  "Fomalhaut",
  "Deneb",
  "Regulus",
  "Polaris",
  "Gamma Cas",
  "Delta Cru",
  "Acrux",
] as const;

const ENTRIES: ObjectSearchEntry[] = NAMES.map((name) => ({
  // Synthetic ids: proper names lowercased; two use the real slugs.
  id: name === "Gamma Cas" ? "gammaCas" : name === "Delta Cru" ? "deltaCru" : name.toLowerCase(),
  name,
}));

describe("normalizeSearchText", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeSearchText("Bételgeuse")).toBe("betelgeuse");
    expect(normalizeSearchText("  VEGA ")).toBe("  vega "); // only trims happen at call site
    expect(normalizeSearchText("Saturne")).toBe("saturne");
  });
});

describe("rankObjects", () => {
  it("returns an alphabetical slice when the query is empty", () => {
    const result = rankObjects("", ENTRIES, 5);
    expect(result).toHaveLength(5);
    const names = result.map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("ranks a name that starts with the query above a substring match", () => {
    const result = rankObjects("al", ENTRIES, ENTRIES.length);
    // All three start with "Al" (Altair, Aldebaran); "Canopus"/"Regulus" contain "al"? no.
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBe("Aldebaran"); // shorter prefix name beats Altair
    // Everything returned must actually match.
    for (const entry of result) {
      expect(entry.name.toLowerCase().startsWith("al") || entry.id.includes("al")).toBe(true);
    }
  });

  it("matches case- and accent-insensitively", () => {
    const lower = rankObjects("betelgeuse", ENTRIES, 3).map((e) => e.name);
    const accent = rankObjects("Bételgeuse", ENTRIES, 3).map((e) => e.name);
    expect(lower[0]).toBe("Betelgeuse");
    expect(accent[0]).toBe("Betelgeuse");
  });

  it("falls back to the stable id when the name does not match", () => {
    const result = rankObjects("gammaCas", ENTRIES, 3);
    expect(result[0].name).toBe("Gamma Cas");
  });

  it("finds multi-word names by a later word (substring)", () => {
    const result = rankObjects("cas", ENTRIES, 3);
    expect(result.map((e) => e.name)).toContain("Gamma Cas");
  });

  it("respects the limit", () => {
    expect(rankObjects("a", ENTRIES, 4)).toHaveLength(4);
    expect(rankObjects("a", ENTRIES, 100).length).toBeLessThanOrEqual(ENTRIES.length);
  });

  it("returns nothing for queries that match no name or id", () => {
    expect(rankObjects("zzzqqq", ENTRIES, 5)).toEqual([]);
  });

  it("keeps the highlight-friendly order stable: best first", () => {
    const result = rankObjects("c", ENTRIES, 10).map((e) => e.name);
    expect(result.length).toBeGreaterThan(1);
    // "Canopus"/"Capella" (prefix) outrank "Acrux"/"Delta Cru" (substring/id).
    expect(result.indexOf("Capella")).toBeLessThan(result.indexOf("Acrux"));
  });
});
