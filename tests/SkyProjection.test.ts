/**
 * SkyProjection.test.ts
 *
 * The aim-able stereographic (fisheye) camera projection: the look direction
 * maps to the view center, altitude/azimuth converge at the zenith when the
 * camera looks up, the antipode is culled, and unproject inverts project. Uses a
 * square 800×800 view looking due south at alt 25°, FOV 90°.
 */
import { Bounds2, type Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { SkyProjection } from "../src/zenith-screen/view/SkyProjection.js";

const square = new Bounds2(0, 0, 800, 800);
const make = (lookAltitudeDeg = 25, lookAzimuthDeg = 180) =>
  new SkyProjection({ bounds: square, lookAzimuthDeg, lookAltitudeDeg, fieldOfViewDeg: 90 });

describe("SkyProjection", () => {
  it("projects the look direction to the view center", () => {
    const point = make().project(25, 180);
    expect(point).not.toBeNull();
    expect(point?.x).toBeCloseTo(400, 4);
    expect(point?.y).toBeCloseTo(400, 4);
  });

  it("maps higher altitude along the look azimuth straight up the center line", () => {
    const point = make().project(35, 180);
    expect(point?.x).toBeCloseTo(400, 4);
    expect(point?.y as number).toBeLessThan(400);
  });

  it("maps increasing azimuth to the right of center", () => {
    const point = make().project(25, 200);
    expect(point?.x as number).toBeGreaterThan(400);
  });

  it("converges all azimuths at the zenith when looking straight up", () => {
    const p = make(90, 0);
    for (const az of [0, 90, 200, 359]) {
      const point = p.project(90, az);
      expect(point?.x).toBeCloseTo(400, 4);
      expect(point?.y).toBeCloseTo(400, 4);
    }
    // Opposite azimuths at high altitude fall on opposite sides of the center.
    const north = p.project(80, 0);
    const south = p.project(80, 180);
    expect(Math.sign((north?.y as number) - 400)).toBe(-Math.sign((south?.y as number) - 400));
  });

  it("culls the antipode and non-finite coordinates", () => {
    const p = make();
    expect(p.project(-25, 0)).toBeNull(); // directly behind the look direction
    expect(p.project(90, NaN)).toBeNull();
    expect(p.project(NaN, 180)).toBeNull();
  });

  it("round-trips project → unproject", () => {
    const p = make();
    for (const [alt, az] of [
      [30, 170],
      [60, 200],
      [10, 150],
    ]) {
      const point = p.project(alt, az);
      expect(point).not.toBeNull();
      const back = p.unproject(point as Vector2);
      expect(back.altDeg).toBeCloseTo(alt, 4);
      expect(back.azDeg).toBeCloseTo(az, 4);
    }
  });

  it("reports a positive degrees-per-pixel matching the center scale", () => {
    const p = make();
    expect(p.degreesPerPixel()).toBeGreaterThan(0);
    expect(p.degreesPerPixelAt(25, 180)).toBeCloseTo(p.degreesPerPixel(), 6);
  });
});
