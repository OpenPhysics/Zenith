/**
 * BrightStarProjection.test.ts
 *
 * Smoke test: a known equatorial position projects to the expected alt/az at
 * Boulder with LST = 0 (NCP altitude = latitude).
 */
import { describe, expect, it } from "vitest";
import { equatorialToHorizontal } from "../src/common/sky/SkyCoordinates.js";
import { DEFAULT_LATITUDE_DEG } from "../src/SimConstants.js";
import {
  BRIGHT_STAR_COUNT,
  BRIGHT_STAR_DEC_DEG,
  BRIGHT_STAR_RA_HOURS,
} from "../src/zenith-screen/model/BrightStarCatalog.js";

describe("BrightStarCatalog projection", () => {
  it("has matching RA / Dec array lengths", () => {
    expect(BRIGHT_STAR_RA_HOURS.length).toBe(BRIGHT_STAR_COUNT);
    expect(BRIGHT_STAR_DEC_DEG.length).toBe(BRIGHT_STAR_COUNT);
  });

  it("places the North Celestial Pole at altitude = latitude", () => {
    const { altDeg, azDeg } = equatorialToHorizontal(0, 90, DEFAULT_LATITUDE_DEG, 0);
    expect(altDeg).toBeCloseTo(DEFAULT_LATITUDE_DEG, 6);
    expect(azDeg).toBeCloseTo(0, 6);
  });
});
