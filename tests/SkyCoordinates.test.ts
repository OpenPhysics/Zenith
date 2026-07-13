/**
 * SkyCoordinates.test.ts
 *
 * Unit tests for the pure spherical-astronomy transforms. These pin down the
 * behaviour the whole sim relies on: the NCP sits at an altitude equal to the
 * observer's latitude, equatorial objects transit/rise/set where expected, and
 * the equatorial↔horizontal transforms round-trip.
 */

import { describe, expect, it } from "vitest";
import {
  altitudeAtHourAngle,
  declinationBand,
  equatorialToHorizontal,
  equatorialToHorizonVector,
  horizontalToEquatorial,
} from "../src/common/sky/SkyCoordinates.js";

describe("equatorialToHorizontal", () => {
  it("places the North Celestial Pole at an altitude equal to the latitude (due north)", () => {
    const { altDeg, azDeg } = equatorialToHorizontal(0, 90, 40, 12);
    expect(altDeg).toBeCloseTo(40, 6);
    expect(azDeg).toBeCloseTo(0, 6);
  });

  it("places the NCP below the horizon for a southern observer", () => {
    const { altDeg } = equatorialToHorizontal(5, 90, -30, 3);
    expect(altDeg).toBeCloseTo(-30, 6);
  });

  it("transits an equatorial star on the meridian at altitude 90° − |lat|, due south", () => {
    // Hour angle 0 ⇒ LST == RA.
    const { altDeg, azDeg } = equatorialToHorizontal(6, 0, 40, 6);
    expect(altDeg).toBeCloseTo(50, 6);
    expect(azDeg).toBeCloseTo(180, 6);
  });

  it("puts an equatorial star due east on the horizon as it rises (H = −6h)", () => {
    const { altDeg, azDeg } = equatorialToHorizontal(6, 0, 40, 0); // LST − RA = −6h
    expect(altDeg).toBeCloseTo(0, 6);
    expect(azDeg).toBeCloseTo(90, 6);
  });

  it("puts an equatorial star due west on the horizon as it sets (H = +6h)", () => {
    const { altDeg, azDeg } = equatorialToHorizontal(6, 0, 40, 12); // LST − RA = +6h
    expect(altDeg).toBeCloseTo(0, 6);
    expect(azDeg).toBeCloseTo(270, 6);
  });
});

describe("equatorialToHorizonVector", () => {
  it("matches equatorialToHorizontal away from the zenith/nadir", () => {
    const ra = 6;
    const dec = 20;
    const lat = 40;
    const lst = 8;
    const { altDeg } = equatorialToHorizontal(ra, dec, lat, lst);
    const fromHorizontal = equatorialToHorizonVector(ra, dec, lat, lst);
    const back = horizontalToEquatorial(
      (Math.asin(fromHorizontal.z) * 180) / Math.PI,
      (Math.atan2(fromHorizontal.y, fromHorizontal.x) * 180) / Math.PI,
      lat,
      lst,
    );
    expect(back.raHours).toBeCloseTo(ra, 5);
    expect(back.decDeg).toBeCloseTo(dec, 5);
    expect(altDeg).toBeCloseTo((Math.asin(fromHorizontal.z) * 180) / Math.PI, 5);
  });

  it("maps the hour circle through zenith and nadir at the north pole without azimuth jumps", () => {
    const points = Array.from({ length: 25 }, (_, i) => equatorialToHorizonVector(0, -90 + i * 7.5, 90, 3));
    expect(points[0]?.z).toBeCloseTo(-1, 5);
    expect(points.at(-1)?.z).toBeCloseTo(1, 5);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      expect(a?.dot(b)).toBeGreaterThan(0.95);
    }
  });
});

describe("horizontalToEquatorial", () => {
  it("inverts equatorialToHorizontal (round-trip)", () => {
    const ra = 8;
    const dec = 23;
    const lat = 35;
    const lst = 14;
    const horizontal = equatorialToHorizontal(ra, dec, lat, lst);
    const back = horizontalToEquatorial(horizontal.altDeg, horizontal.azDeg, lat, lst);
    expect(back.raHours).toBeCloseTo(ra, 5);
    expect(back.decDeg).toBeCloseTo(dec, 5);
  });

  it("maps the zenith to RA = LST and Dec = latitude", () => {
    const { raHours, decDeg } = horizontalToEquatorial(90, 0, 40, 7);
    expect(decDeg).toBeCloseTo(40, 6);
    expect(raHours).toBeCloseTo(7, 6);
  });
});

describe("altitudeAtHourAngle", () => {
  it("is highest at upper culmination (H = 0)", () => {
    const upper = altitudeAtHourAngle(20, 40, 0);
    const lower = altitudeAtHourAngle(20, 40, 12);
    expect(upper).toBeGreaterThan(lower);
    expect(upper).toBeCloseTo(70, 6); // 90 − |40 − 20|
  });
});

describe("declinationBand", () => {
  it("classifies high-declination stars as circumpolar at mid-northern latitude", () => {
    expect(declinationBand(70, 40)).toBe("circumpolar"); // dec ≥ 90 − 40
  });

  it("classifies equatorial stars as rising-and-setting", () => {
    expect(declinationBand(0, 40)).toBe("risesAndSets");
  });

  it("classifies far-southern stars as never rising for a northern observer", () => {
    expect(declinationBand(-70, 40)).toBe("neverRises");
  });

  it("flips circumpolar/never-rises in the southern hemisphere", () => {
    expect(declinationBand(-70, -40)).toBe("circumpolar");
    expect(declinationBand(70, -40)).toBe("neverRises");
  });
});
