/**
 * moonPhaseShape.test.ts
 */
import { describe, expect, it } from "vitest";
import { discUnlitShape } from "../src/common/sky/moonPhaseShape.js";

describe("discUnlitShape", () => {
  it("is empty at full phase", () => {
    const shape = discUnlitShape(10, 1, true);
    expect(shape.bounds.isEmpty()).toBe(true);
  });

  it("covers the full disc at new phase", () => {
    const shape = discUnlitShape(10, 0, true);
    expect(shape.bounds.minX).toBeCloseTo(-10, 5);
    expect(shape.bounds.maxX).toBeCloseTo(10, 5);
    expect(shape.bounds.minY).toBeCloseTo(-10, 5);
    expect(shape.bounds.maxY).toBeCloseTo(10, 5);
  });

  it("covers the left half at first quarter (lit on right)", () => {
    const shape = discUnlitShape(10, 0.5, true);
    expect(shape.bounds.minX).toBeLessThan(-5);
    expect(shape.bounds.maxX).toBeLessThanOrEqual(0.5);
    expect(shape.bounds.minY).toBeCloseTo(-10, 5);
    expect(shape.bounds.maxY).toBeCloseTo(10, 5);
  });

  it("covers the right half at third quarter (lit on left)", () => {
    const shape = discUnlitShape(10, 0.5, false);
    expect(shape.bounds.maxX).toBeGreaterThan(5);
    expect(shape.bounds.minX).toBeGreaterThanOrEqual(-0.5);
    expect(shape.bounds.minY).toBeCloseTo(-10, 5);
    expect(shape.bounds.maxY).toBeCloseTo(10, 5);
  });

  it("crescent unlit bounds are wider than gibbous unlit bounds", () => {
    const crescent = discUnlitShape(10, 0.25, true);
    const gibbous = discUnlitShape(10, 0.75, true);
    expect(crescent.bounds.width).toBeGreaterThan(gibbous.bounds.width);
  });
});
