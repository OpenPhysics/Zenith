/**
 * sky-horizon.test.ts
 *
 * Pure horizon geometry: circumcircle fit and horizon/ground shape construction.
 */

import { Bounds2, Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { circleThroughPoints, horizonAndGroundShapes } from "../src/zenith-screen/view/sky-horizon.js";

describe("circleThroughPoints", () => {
  it("recovers the circumcircle of three known points", () => {
    // Unit circle centered at (10, 20): points at 0°, 90°, 180°.
    const a = new Vector2(11, 20);
    const b = new Vector2(10, 21);
    const c = new Vector2(9, 20);
    const circle = circleThroughPoints(a, b, c);
    expect(circle).not.toBeNull();
    expect(circle?.center.x).toBeCloseTo(10, 6);
    expect(circle?.center.y).toBeCloseTo(20, 6);
    expect(circle?.radius).toBeCloseTo(1, 6);
  });

  it("returns null for collinear points", () => {
    expect(circleThroughPoints(new Vector2(0, 0), new Vector2(1, 1), new Vector2(2, 2))).toBeNull();
  });
});

describe("horizonAndGroundShapes", () => {
  const bounds = new Bounds2(0, 0, 800, 800);

  it("returns nulls when fewer than three horizon samples project", () => {
    let calls = 0;
    const project = (): Vector2 | null => {
      calls += 1;
      return calls <= 2 ? new Vector2(calls * 10, 400) : null;
    };
    expect(horizonAndGroundShapes(project, bounds)).toEqual({ horizon: null, ground: null });
  });

  it("fits a finite-radius horizon circle when looking south at moderate altitude", () => {
    // Synthetic horizon arc: a large circle whose center sits above the view so
    // the ground fills below the chord through the panel.
    const center = new Vector2(400, -200);
    const radius = 900;
    const project = (altDeg: number, azDeg: number): Vector2 | null => {
      if (altDeg !== 0) {
        return null;
      }
      const angle = ((azDeg - 180) * Math.PI) / 180;
      return new Vector2(center.x + radius * Math.sin(angle), center.y + radius * Math.cos(angle));
    };
    const { horizon, ground } = horizonAndGroundShapes(project, bounds);
    expect(horizon).not.toBeNull();
    expect(ground).not.toBeNull();
  });

  it("returns nulls (or fills the frame) when looking at zenith with no horizon samples", () => {
    // Looking straight up: every horizon sample is behind the camera → culled.
    const project = (): Vector2 | null => null;
    expect(horizonAndGroundShapes(project, bounds)).toEqual({ horizon: null, ground: null });
  });
});
