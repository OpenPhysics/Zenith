/**
 * moonPhaseShape.test.ts
 */
import { describe, expect, it } from "vitest";
import { moonUnlitShape } from "../src/common/sky/moonPhaseShape.js";

describe("moonUnlitShape", () => {
  it("is empty at full Moon", () => {
    const shape = moonUnlitShape(10, 1, true);
    expect(shape.bounds.isEmpty()).toBe(true);
  });

  it("covers the full disc at new Moon", () => {
    const shape = moonUnlitShape(10, 0, true);
    expect(shape.bounds.minX).toBeCloseTo(-10, 5);
    expect(shape.bounds.maxX).toBeCloseTo(10, 5);
    expect(shape.bounds.minY).toBeCloseTo(-10, 5);
    expect(shape.bounds.maxY).toBeCloseTo(10, 5);
  });

  it("covers the left half at first quarter (waxing)", () => {
    const shape = moonUnlitShape(10, 0.5, true);
    expect(shape.bounds.minX).toBeLessThan(-5);
    expect(shape.bounds.maxX).toBeLessThanOrEqual(0.5);
    expect(shape.bounds.minY).toBeCloseTo(-10, 5);
    expect(shape.bounds.maxY).toBeCloseTo(10, 5);
  });

  it("covers the right half at third quarter (waning)", () => {
    const shape = moonUnlitShape(10, 0.5, false);
    expect(shape.bounds.maxX).toBeGreaterThan(5);
    expect(shape.bounds.minX).toBeGreaterThanOrEqual(-0.5);
    expect(shape.bounds.minY).toBeCloseTo(-10, 5);
    expect(shape.bounds.maxY).toBeCloseTo(10, 5);
  });

  it("crescent unlit bounds are wider than gibbous unlit bounds", () => {
    const crescent = moonUnlitShape(10, 0.25, true);
    const gibbous = moonUnlitShape(10, 0.75, true);
    expect(crescent.bounds.width).toBeGreaterThan(gibbous.bounds.width);
  });
});
