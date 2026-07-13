/**
 * NamedBrightStars.test.ts
 *
 * Sanity checks for curated stars and constellation stick-figure wiring.
 */

import { describe, expect, it } from "vitest";
import { CONSTELLATION_FIGURES } from "../src/zenith-screen/model/ConstellationLines.js";
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

  it("wires every constellation segment to a named star", () => {
    for (const figure of CONSTELLATION_FIGURES) {
      expect(figure.segments.length).toBeGreaterThan(0);
      for (const segment of figure.segments) {
        expect(namedStarById(segment.fromId)).toBeDefined();
        expect(namedStarById(segment.toId)).toBeDefined();
      }
    }
  });
});
