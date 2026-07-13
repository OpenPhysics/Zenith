/**
 * NamedBrightStars.test.ts
 *
 * Sanity checks for curated stars and constellation stick-figure wiring.
 */

import { describe, expect, it } from "vitest";
import {
  CONSTELLATION_FIGURES,
  CONSTELLATION_STARS,
  constellationStarById,
} from "../src/zenith-screen/model/ConstellationLines.js";
import { NAMED_BRIGHT_STARS, namedStarById } from "../src/zenith-screen/model/NamedBrightStars.js";

describe("NamedBrightStars", () => {
  it("includes classroom staples with finite J2000 coordinates", () => {
    for (const id of ["polaris", "sirius", "vega", "betelgeuse", "acrux"]) {
      const star = namedStarById(id);
      expect(star).toBeDefined();
      if (!star) {
        continue;
      }
      expect(Number.isFinite(star.raHours)).toBe(true);
      expect(Number.isFinite(star.decDeg)).toBe(true);
    }
    expect(NAMED_BRIGHT_STARS.length).toBeGreaterThan(20);
  });
});

describe("ConstellationLines", () => {
  it("covers all 88 IAU constellations", () => {
    expect(CONSTELLATION_FIGURES).toHaveLength(88);
    const ids = new Set(CONSTELLATION_FIGURES.map((f) => f.id));
    expect(ids.size).toBe(88);
    for (const id of ["ursaMajor", "orion", "cassiopeia", "crux"] as const) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("wires every constellation segment to a constellation star", () => {
    expect(Object.keys(CONSTELLATION_STARS).length).toBeGreaterThan(600);
    for (const figure of CONSTELLATION_FIGURES) {
      expect(figure.segments.length).toBeGreaterThan(0);
      for (const segment of figure.segments) {
        expect(constellationStarById(segment.fromId)).toBeDefined();
        expect(constellationStarById(segment.toId)).toBeDefined();
      }
    }
  });
});
