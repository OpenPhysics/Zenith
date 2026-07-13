/**
 * EclipticCoordinates.test.ts
 *
 * Unit tests for the ecliptic ↔ equatorial transform. These pin the four cardinal
 * points of the ecliptic (equinoxes and solstices) against known astronomy and
 * check that the sampled great circle closes and stays within the obliquity band.
 */

import { describe, expect, it } from "vitest";
import {
  eclipticEquatorPoints,
  eclipticToEquatorial,
  OBLIQUITY_J2000_DEG,
} from "../src/common/sky/EclipticCoordinates.js";

describe("eclipticToEquatorial", () => {
  it("maps the vernal equinox (λ = 0) to RA 0h, Dec 0°", () => {
    const { raHours, decDeg } = eclipticToEquatorial(0, 0);
    expect(raHours).toBeCloseTo(0, 6);
    expect(decDeg).toBeCloseTo(0, 6);
  });

  it("maps the summer solstice point (λ = 90) to RA 6h, Dec +ε", () => {
    const { raHours, decDeg } = eclipticToEquatorial(90, 0);
    expect(raHours).toBeCloseTo(6, 6);
    expect(decDeg).toBeCloseTo(OBLIQUITY_J2000_DEG, 6);
  });

  it("maps the autumnal equinox (λ = 180) to RA 12h, Dec 0°", () => {
    const { raHours, decDeg } = eclipticToEquatorial(180, 0);
    expect(raHours).toBeCloseTo(12, 6);
    expect(decDeg).toBeCloseTo(0, 6);
  });

  it("maps the winter solstice point (λ = 270) to RA 18h, Dec −ε", () => {
    const { raHours, decDeg } = eclipticToEquatorial(270, 0);
    expect(raHours).toBeCloseTo(18, 6);
    expect(decDeg).toBeCloseTo(-OBLIQUITY_J2000_DEG, 6);
  });
});

describe("eclipticEquatorPoints", () => {
  it("returns a closed loop (37 points) that never leaves the obliquity band", () => {
    const points = eclipticEquatorPoints(10);
    expect(points.length).toBe(37);
    for (const { decDeg } of points) {
      expect(decDeg).toBeGreaterThanOrEqual(-OBLIQUITY_J2000_DEG - 1e-6);
      expect(decDeg).toBeLessThanOrEqual(OBLIQUITY_J2000_DEG + 1e-6);
    }
  });
});
