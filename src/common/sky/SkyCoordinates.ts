/**
 * SkyCoordinates.ts
 *
 * Pure spherical-astronomy helpers shared by every screen. No scenery / model
 * dependencies — only `Vector3` from dot — so the whole module is trivially
 * unit-testable (see tests/SkyCoordinates.test.ts).
 *
 * ── Conventions ───────────────────────────────────────────────────────────────
 *  - Right ascension (RA) is in hours [0, 24); declination (Dec) in degrees.
 *  - Latitude in degrees, +N / −S. Local sidereal time (LST) in hours.
 *  - Altitude in degrees above the horizon; azimuth in degrees measured from
 *    North (0°) increasing through East (90°), South (180°), West (270°).
 *  - Hour angle H = LST − RA (hours), positive when the object is west of the
 *    meridian.
 *
 * ── 3-D frames (unit sphere) ──────────────────────────────────────────────────
 *  Equatorial frame (used as the world frame for the celestial sphere):
 *    +Z → North Celestial Pole, equator in the XY-plane, +X at RA 0h.
 *  Horizon frame (used as the world frame for the horizon dome):
 *    +Z → zenith, +X → North, +Y → East.
 */

import { Vector3 } from "scenerystack/dot";

export type EquatorialCoordinates = { raHours: number; decDeg: number };
export type HorizontalCoordinates = { altDeg: number; azDeg: number };

/** Where a star of a given declination spends its day at a given latitude. */
export type DeclinationBand = "circumpolar" | "risesAndSets" | "neverRises";

export const HOURS_PER_DAY = 24;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const HOURS_TO_RAD = (2 * Math.PI) / HOURS_PER_DAY;

export const degToRad = (deg: number): number => deg * DEG_TO_RAD;
export const radToDeg = (rad: number): number => rad * RAD_TO_DEG;
export const hoursToRadians = (hours: number): number => hours * HOURS_TO_RAD;
export const radiansToHours = (rad: number): number => rad / HOURS_TO_RAD;

/** Wraps an hour value into [0, 24). */
export const normalizeHours = (hours: number): number => ((hours % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;

/** Wraps a degree value into [0, 360). */
export const normalizeDegrees = (deg: number): number => ((deg % 360) + 360) % 360;

/** Hour angle H = LST − RA, wrapped into [−12, 12) hours. */
export const hourAngle = (raHours: number, lstHours: number): number => {
  const h = normalizeHours(lstHours - raHours);
  return h >= HOURS_PER_DAY / 2 ? h - HOURS_PER_DAY : h;
};

/** Equatorial (RA, Dec) → unit vector in the equatorial frame (+Z = NCP). */
export const raDecToVector3 = (raHours: number, decDeg: number): Vector3 => {
  const ra = hoursToRadians(raHours);
  const dec = degToRad(decDeg);
  const cosDec = Math.cos(dec);
  return new Vector3(cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec));
};

/** Horizontal (Alt, Az) → unit vector in the horizon frame (+X = N, +Y = E, +Z = up). */
export const altAzToVector3 = (altDeg: number, azDeg: number): Vector3 => {
  const alt = degToRad(altDeg);
  const az = degToRad(azDeg);
  const cosAlt = Math.cos(alt);
  return new Vector3(cosAlt * Math.cos(az), cosAlt * Math.sin(az), Math.sin(alt));
};

/**
 * Equatorial → horizontal for an observer at `latitudeDeg` and local sidereal
 * time `lstHours`. Standard astronomy transform.
 */
export const equatorialToHorizontal = (
  raHours: number,
  decDeg: number,
  latitudeDeg: number,
  lstHours: number,
): HorizontalCoordinates => {
  const dec = degToRad(decDeg);
  const lat = degToRad(latitudeDeg);
  const ha = hoursToRadians(hourAngle(raHours, lstHours));

  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAlt = Math.cos(alt);

  // Azimuth from North through East. atan2 keeps the correct quadrant.
  const sinAz = (-Math.cos(dec) * Math.sin(ha)) / cosAlt;
  const cosAz = (Math.sin(dec) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * cosAlt);
  const az = normalizeDegrees(radToDeg(Math.atan2(sinAz, cosAz)));

  return { altDeg: radToDeg(alt), azDeg: az };
};

/**
 * Equatorial → horizon as a unit vector (+X north, +Y east, +Z zenith). Uses the
 * same astronomy as {@link equatorialToHorizontal} but skips alt/az, so paths
 * through the zenith or nadir stay smooth at the poles.
 */
export const equatorialToHorizonVector = (
  raHours: number,
  decDeg: number,
  latitudeDeg: number,
  lstHours: number,
): Vector3 => {
  const dec = degToRad(decDeg);
  const lat = degToRad(latitudeDeg);
  const ha = hoursToRadians(hourAngle(raHours, lstHours));

  const north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha);
  const east = -Math.cos(dec) * Math.sin(ha);
  const up = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);

  return new Vector3(north, east, up).normalized();
};

/**
 * Horizontal → equatorial — the inverse of {@link equatorialToHorizontal}. Used
 * when the user shift-clicks a point on the horizon dome to create a star there.
 */
export const horizontalToEquatorial = (
  altDeg: number,
  azDeg: number,
  latitudeDeg: number,
  lstHours: number,
): EquatorialCoordinates => {
  const alt = degToRad(altDeg);
  const az = degToRad(azDeg);
  const lat = degToRad(latitudeDeg);

  const sinDec = Math.sin(lat) * Math.sin(alt) + Math.cos(lat) * Math.cos(alt) * Math.cos(az);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const cosDec = Math.cos(dec);

  const sinHa = (-Math.cos(alt) * Math.sin(az)) / cosDec;
  const cosHa = (Math.sin(alt) - Math.sin(lat) * sinDec) / (Math.cos(lat) * cosDec);
  const haHours = radiansToHours(Math.atan2(sinHa, cosHa));

  return { raHours: normalizeHours(lstHours - haHours), decDeg: radToDeg(dec) };
};

/** Altitude (degrees) of a star at the given hour angle — used for culmination. */
export const altitudeAtHourAngle = (decDeg: number, latitudeDeg: number, hourAngleHours: number): number => {
  const dec = degToRad(decDeg);
  const lat = degToRad(latitudeDeg);
  const ha = hoursToRadians(hourAngleHours);
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  return radToDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
};

/**
 * Classifies a declination at a latitude as circumpolar (never sets), never
 * rising, or rising-and-setting, by comparing the altitudes at upper (H = 0) and
 * lower (H = 12h) culmination against the horizon.
 */
export const declinationBand = (decDeg: number, latitudeDeg: number): DeclinationBand => {
  const maxAlt = altitudeAtHourAngle(decDeg, latitudeDeg, 0);
  const minAlt = altitudeAtHourAngle(decDeg, latitudeDeg, HOURS_PER_DAY / 2);
  if (minAlt >= 0) {
    return "circumpolar";
  }
  if (maxAlt <= 0) {
    return "neverRises";
  }
  return "risesAndSets";
};
