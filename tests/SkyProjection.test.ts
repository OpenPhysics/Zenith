/**
 * SkyProjection.test.ts
 *
 * The alt/az → pixel value object: FOV-centered mapping, cull margin, and
 * degrees-per-pixel. Uses a square 800×800 view looking due south at alt 25°.
 */
import { Bounds2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { SkyProjection } from "../src/zenith-screen/view/SkyProjection.js";

const square = new Bounds2(0, 0, 800, 800);
const make = () => new SkyProjection({ bounds: square, lookAzimuthDeg: 180, lookAltitudeDeg: 25, fieldOfViewDeg: 90 });

describe("SkyProjection", () => {
  it("projects the look direction to the view center", () => {
    const point = make().project(25, 180);
    expect(point).not.toBeNull();
    expect(point?.x).toBeCloseTo(400, 6);
    expect(point?.y).toBeCloseTo(400, 6);
  });

  it("computes a symmetric altitude band from the (square) vertical FOV", () => {
    const p = make();
    expect(p.altMin).toBeCloseTo(-20, 6);
    expect(p.altMax).toBeCloseTo(70, 6);
  });

  it("wraps azimuth offset into [-180, 180)", () => {
    const p = make();
    expect(p.azOffset(180)).toBeCloseTo(0, 6);
    expect(p.azOffset(200)).toBeCloseTo(20, 6);
    expect(p.azOffset(170)).toBeCloseTo(-10, 6);
    expect(p.azOffset(0)).toBeCloseTo(-180, 6); // due north is behind → wraps to −180 edge
  });

  it("culls points beyond the FOV plus margin", () => {
    const p = make();
    expect(p.project(25, 270)).toBeNull(); // 90° off-axis in azimuth
    expect(p.project(85, 180)).toBeNull(); // above altMax + margin
  });

  it("reports horizontal degrees per pixel", () => {
    expect(make().degreesPerPixel()).toBeCloseTo(90 / 800, 10);
  });
});
