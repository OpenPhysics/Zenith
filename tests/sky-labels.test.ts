/**
 * sky-labels.test.ts
 *
 * Pure alt/az and equatorial grid label placement helpers.
 */

import { Bounds2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { SkyProjection } from "../src/zenith-screen/view/SkyProjection.js";
import {
  bestEquatorialLabelPointForDec,
  bestEquatorialLabelPointForRa,
  placeAltitudeLabel,
  placeAzimuthLabel,
} from "../src/zenith-screen/view/sky-labels.js";

const bounds = new Bounds2(0, 0, 800, 800);
const lookingSouth = new SkyProjection({
  bounds,
  lookAzimuthDeg: 180,
  lookAltitudeDeg: 30,
  fieldOfViewDeg: 90,
});

describe("placeAltitudeLabel", () => {
  it("skips the horizon and zenith", () => {
    expect(placeAltitudeLabel(lookingSouth, bounds, 0)).toBeNull();
    expect(placeAltitudeLabel(lookingSouth, bounds, 90)).toBeNull();
  });

  it("places a mid-altitude label along the look azimuth", () => {
    const placement = placeAltitudeLabel(lookingSouth, bounds, 45);
    expect(placement).not.toBeNull();
    expect(placement?.align).toBe("left");
    // On the central meridian (look az = 180), x stays near the view center.
    expect(placement?.point.x).toBeCloseTo(400, 0);
    expect(placement?.point.y as number).toBeLessThan(400);
  });
});

describe("placeAzimuthLabel", () => {
  it("returns a point at the expected azimuth just above the horizon", () => {
    const placement = placeAzimuthLabel(lookingSouth, bounds, 180);
    expect(placement).not.toBeNull();
    expect(placement?.align).toBe("center");
    expect(placement?.point.x).toBeCloseTo(400, 0);
    expect(placement?.point.y as number).toBeGreaterThan(400);
  });
});

describe("bestEquatorialLabelPointForRa", () => {
  it("prefers samples near the celestial equator when visible", () => {
    // Boulder-ish lat, LST chosen so RA 12h is near the southern meridian.
    const point = bestEquatorialLabelPointForRa(lookingSouth, bounds, 12, 40, 12, true, bounds.center);
    expect(point).not.toBeNull();
  });

  it("returns null when every sample is out of the FOV", () => {
    // Narrow FOV aimed north so the RA=12h hour circle never lands in-bounds.
    const lookingNorthLow = new SkyProjection({
      bounds,
      lookAzimuthDeg: 0,
      lookAltitudeDeg: 10,
      fieldOfViewDeg: 20,
    });
    const point = bestEquatorialLabelPointForRa(lookingNorthLow, bounds, 12, 40, 12, true, bounds.center);
    expect(point).toBeNull();
  });
});

describe("bestEquatorialLabelPointForDec", () => {
  it("returns the sample nearest the FOV center", () => {
    const point = bestEquatorialLabelPointForDec(lookingSouth, bounds, 0, 40, 12, true, bounds.center);
    expect(point).not.toBeNull();
    // Dec 0° near RA = LST = 12h sits on the southern meridian → near view center-ish.
    expect(point?.distance(bounds.center) as number).toBeLessThan(250);
  });

  it("returns null when all samples are out of bounds", () => {
    const lookingNorthLow = new SkyProjection({
      bounds,
      lookAzimuthDeg: 0,
      lookAltitudeDeg: 5,
      fieldOfViewDeg: 15,
    });
    const point = bestEquatorialLabelPointForDec(lookingNorthLow, bounds, -80, 40, 12, true, bounds.center);
    expect(point).toBeNull();
  });
});
