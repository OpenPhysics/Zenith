/**
 * PlanetEphemeris.ts
 *
 * Thin wrapper around astronomy-engine for geocentric equatorial positions of
 * the Sun, Moon, and major planets. Pure functions — no Scenery / model deps.
 *
 * Positions are returned in J2000 equatorial coordinates so they share a frame
 * with the bright-star catalog; use SkyCoordinates.equatorialToHorizontal with
 * local sidereal time derived from {@link localSiderealTimeHours}.
 */

import { Body, Equator, Illumination, MakeTime, Observer, SiderealTime } from "astronomy-engine";
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
