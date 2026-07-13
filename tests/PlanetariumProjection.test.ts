/**
 * PlanetariumProjection.test.ts
 *
 * Screen mapping helpers: vertical FOV tracks aspect ratio so az/alt share one
 * degrees-per-pixel scale.
 */
import { describe, expect, it } from "vitest";
import { verticalFieldOfViewDeg } from "../src/zenith-screen/view/PlanetariumSkyNode.js";

describe("verticalFieldOfViewDeg", () => {
  it("matches horizontal FOV on a square view", () => {
    expect(verticalFieldOfViewDeg(90, 800, 800)).toBe(90);
  });

  it("scales with height/width so °/px is isomorphic", () => {
    // 90° across 1600 px → 0.05625 °/px; 900 px tall → 50.625° vertical.
    expect(verticalFieldOfViewDeg(90, 1600, 900)).toBeCloseTo(50.625, 10);
  });

  it("grows taller than horizontal FOV on portrait views", () => {
    expect(verticalFieldOfViewDeg(60, 600, 1200)).toBe(120);
  });

  it("falls back to horizontal FOV when width is non-positive", () => {
    expect(verticalFieldOfViewDeg(75, 0, 400)).toBe(75);
  });
});
