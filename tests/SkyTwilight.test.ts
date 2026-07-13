/**
 * SkyTwilight.test.ts
 *
 * Pins twilight color / star-visibility ramps so day/night pedagogy stays stable.
 */

import { Color } from "scenerystack/scenery";
import { describe, expect, it } from "vitest";
import {
  ASTRONOMICAL_TWILIGHT_DEG,
  CIVIL_TWILIGHT_DEG,
  effectiveStarVisibility,
  starVisibilityFromSolarAltitude,
  twilightSkyColors,
} from "../src/common/sky/SkyTwilight.js";

const PALETTE = {
  nightZenith: new Color("#070b18"),
  nightHorizon: new Color("#0c1424"),
  nightGround: new Color("#121820"),
  dayZenith: new Color("#4a90d9"),
  dayHorizon: new Color("#a8c8e8"),
  dayGround: new Color("#3a4a38"),
  twilightHorizon: new Color("#e09050"),
};

describe("starVisibilityFromSolarAltitude", () => {
  it("is fully visible below astronomical twilight", () => {
    expect(starVisibilityFromSolarAltitude(ASTRONOMICAL_TWILIGHT_DEG - 1)).toBe(1);
  });

  it("is fully washed out once the Sun is above the horizon", () => {
    expect(starVisibilityFromSolarAltitude(0)).toBe(0);
    expect(starVisibilityFromSolarAltitude(30)).toBe(0);
  });

  it("fades through twilight", () => {
    const mid = starVisibilityFromSolarAltitude(CIVIL_TWILIGHT_DEG);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe("effectiveStarVisibility", () => {
  it("matches solar-altitude fade when atmosphere is on", () => {
    expect(effectiveStarVisibility(30, true)).toBe(0);
    expect(effectiveStarVisibility(ASTRONOMICAL_TWILIGHT_DEG - 1, true)).toBe(1);
  });

  it("keeps stars fully visible when atmosphere is off", () => {
    expect(effectiveStarVisibility(30, false)).toBe(1);
    expect(effectiveStarVisibility(0, false)).toBe(1);
  });
});

describe("twilightSkyColors", () => {
  it("returns night palette deep in night", () => {
    const colors = twilightSkyColors(-30, PALETTE);
    expect(colors.zenith.equals(PALETTE.nightZenith)).toBe(true);
    expect(colors.ground.equals(PALETTE.nightGround)).toBe(true);
  });

  it("moves toward day colors with the Sun high", () => {
    const colors = twilightSkyColors(45, PALETTE);
    expect(colors.zenith.equals(PALETTE.dayZenith)).toBe(true);
    expect(colors.horizon.equals(PALETTE.dayHorizon)).toBe(true);
  });
});
