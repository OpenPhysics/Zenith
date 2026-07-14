/**
 * PlanetEphemeris.ts
 *
 * Thin wrapper around astronomy-engine for geocentric equatorial positions of
 * the Sun, Moon, and major planets. Pure functions — no Scenery / model deps.
 *
 * Positions are returned in J2000 equatorial coordinates so they share a frame
 * with the bright-star catalog; use SkyCoordinates.equatorialToHorizontal with
 * local sidereal time derived from {@link localSiderealTimeHours}.
 *
 * Frame caveat: positions are J2000 (EQJ) while {@link localSiderealTimeHours}
 * uses Greenwich *apparent* (of-date) sidereal time, so the hour angle LST − RA
 * carries the accumulated precession/nutation offset in RA. This is internally
 * consistent — stars and planets share the convention and stay aligned with each
 * other — and negligible near epoch 2000, but absolute alt/az (and rise/set
 * azimuths) drift for epochs many decades from J2000. Acceptable for an
 * educational planetarium sharing one fixed catalog frame; switch to of-date
 * (EQD) positions here if far-epoch absolute accuracy is ever required.
 */

import {
  Body,
  Equator,
  Illumination,
  KM_PER_AU,
  MakeTime,
  MoonPhase,
  Observer,
  RAD2DEG,
  SiderealTime,
} from "astronomy-engine";
import { normalizeHours } from "./SkyCoordinates.js";

/** Solar-system bodies shown in the Zenith planetarium (v1). */
export type PlanetBodyId = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune";

export const PLANET_BODY_IDS: readonly PlanetBodyId[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
] as const;

const BODY_MAP: Record<PlanetBodyId, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
};

export type PlanetEquatorialState = {
  raHours: number;
  decDeg: number;
  /** Visual magnitude (Illumination); Sun/Moon use typical bright values. */
  mag: number;
  /** Topocentric distance in AU (from astronomy-engine Equator). */
  distAu: number;
};

/**
 * Lunar phase for disc rendering.
 * `phaseFraction` is 0 at new Moon and 1 at full; `waxing` is true from new → full.
 */
export type MoonPhaseState = {
  phaseFraction: number;
  waxing: boolean;
  /** Illumination phase angle in degrees (0 = full, 180 = new). */
  phaseAngleDeg: number;
};

/**
 * Greenwich apparent sidereal time (hours) + longitude → local sidereal time.
 * Longitude is degrees east-positive (matches ZenithModel).
 */
export const localSiderealTimeHours = (civilTimeMs: number, longitudeDeg: number): number => {
  const gastHours = SiderealTime(MakeTime(new Date(civilTimeMs)));
  return normalizeHours(gastHours + longitudeDeg / 15);
};

/**
 * Equatorial J2000 position of a body for an Earth observer at the given civil time.
 */
export const planetEquatorialState = (
  bodyId: PlanetBodyId,
  civilTimeMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
): PlanetEquatorialState => {
  const time = MakeTime(new Date(civilTimeMs));
  const observer = new Observer(latitudeDeg, longitudeDeg, 0);
  const body = BODY_MAP[bodyId];

  // ofdate=false → J2000 (EQJ), matching the bright-star catalog frame.
  const eq = Equator(body, time, observer, false, true);

  let mag: number;
  if (bodyId === "sun") {
    mag = -26.74;
  } else if (bodyId === "moon") {
    mag = Illumination(Body.Moon, time).mag;
  } else {
    mag = Illumination(body, time).mag;
  }

  return {
    raHours: eq.ra,
    decDeg: eq.dec,
    mag,
    distAu: eq.dist,
  };
};

/**
 * Apparent angular diameter in degrees for a sphere of radius `radiusKm` at
 * topocentric distance `distAu`.
 *
 * θ = 2 atan(R / d)
 */
export const apparentAngularDiameterDeg = (radiusKm: number, distAu: number): number => {
  if (!(distAu > 0 && radiusKm > 0)) {
    return 0;
  }
  return 2 * Math.atan(radiusKm / (distAu * KM_PER_AU)) * RAD2DEG;
};

/**
 * Convert an angular diameter (degrees) to a screen disc radius (pixels) given
 * degrees-per-pixel of the FOV projection.
 */
export const angularDiameterToRadiusPx = (
  angularDiameterDeg: number,
  degreesPerPixel: number,
  minRadiusPx: number,
): number => {
  if (!(degreesPerPixel > 0 && angularDiameterDeg > 0)) {
    return minRadiusPx;
  }
  return Math.max(minRadiusPx, angularDiameterDeg / (2 * degreesPerPixel));
};

/**
 * Illuminated fraction and waxing/waning sense for Moon disc shading.
 * Uses astronomy-engine Illumination + MoonPhase (ecliptic elongation).
 */
export const moonPhaseState = (civilTimeMs: number): MoonPhaseState => {
  const time = MakeTime(new Date(civilTimeMs));
  const illumination = Illumination(Body.Moon, time);
  const elongationDeg = MoonPhase(time);
  return {
    phaseFraction: illumination.phase_fraction,
    phaseAngleDeg: illumination.phase_angle,
    // MoonPhase: 0 = new, 90 = first quarter, 180 = full, 270 = third quarter.
    waxing: elongationDeg < 180,
  };
};

/** All v1 bodies at once (convenient for the view redraw). */
export const allPlanetEquatorialStates = (
  civilTimeMs: number,
  latitudeDeg: number,
  longitudeDeg: number,
): ReadonlyArray<{ bodyId: PlanetBodyId; state: PlanetEquatorialState }> =>
  PLANET_BODY_IDS.map((bodyId) => ({
    bodyId,
    state: planetEquatorialState(bodyId, civilTimeMs, latitudeDeg, longitudeDeg),
  }));
