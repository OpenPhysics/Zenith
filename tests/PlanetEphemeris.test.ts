/**
 * PlanetEphemeris.test.ts
 *
 * Pins astronomy-engine positions for a documented epoch so regressions in the
 * wrapper (frame choice, LST formula) are caught.
 */
import { describe, expect, it } from "vitest";
import { localSiderealTimeHours, planetEquatorialState } from "../src/common/sky/PlanetEphemeris.js";
import { equatorialToHorizontal } from "../src/common/sky/SkyCoordinates.js";
import { DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG } from "../src/SimConstants.js";

/** 2024-06-21 18:00 UTC ≈ noon Mountain Daylight Time (summer solstice). */
const EPOCH_MS = Date.UTC(2024, 5, 21, 18, 0, 0);

describe("localSiderealTimeHours", () => {
  it("returns a value in [0, 24)", () => {
    const lst = localSiderealTimeHours(EPOCH_MS, DEFAULT_LONGITUDE_DEG);
    expect(lst).toBeGreaterThanOrEqual(0);
    expect(lst).toBeLessThan(24);
  });
});

describe("planetEquatorialState", () => {
  it("places the Sun near RA 6h and Dec +23° at the June solstice epoch", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    expect(sun.raHours).toBeGreaterThan(5.5);
    expect(sun.raHours).toBeLessThan(6.5);
    expect(sun.decDeg).toBeGreaterThan(22);
    expect(sun.decDeg).toBeLessThan(24);
    expect(sun.mag).toBeLessThan(-20);
  });

  it("places the Sun high in the southern sky at Boulder near local noon", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const lst = localSiderealTimeHours(EPOCH_MS, DEFAULT_LONGITUDE_DEG);
    const { altDeg, azDeg } = equatorialToHorizontal(sun.raHours, sun.decDeg, DEFAULT_LATITUDE_DEG, lst);
    // Summer noon at ~40°N: Sun well above horizon, roughly south.
    expect(altDeg).toBeGreaterThan(50);
    expect(azDeg).toBeGreaterThan(90);
    expect(azDeg).toBeLessThan(270);
  });

  it("returns finite Mars magnitude and coordinates", () => {
    const mars = planetEquatorialState("mars", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    expect(Number.isFinite(mars.raHours)).toBe(true);
    expect(Number.isFinite(mars.decDeg)).toBe(true);
    expect(Number.isFinite(mars.mag)).toBe(true);
  });

  it("returns a Moon position distinct from the Sun", () => {
    const sun = planetEquatorialState("sun", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const moon = planetEquatorialState("moon", EPOCH_MS, DEFAULT_LATITUDE_DEG, DEFAULT_LONGITUDE_DEG);
    const dra = Math.abs(sun.raHours - moon.raHours);
    expect(dra > 0.1 || Math.abs(sun.decDeg - moon.decDeg) > 0.1).toBe(true);
  });
});
