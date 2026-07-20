/**
 * sky-labels.ts
 *
 * Pure helpers for placing alt/az and equatorial grid tick labels. Extracted
 * from `PlanetariumSkyNode` so the placement math is unit-testable without
 * constructing the scene graph. Each placer returns a screen-space point (and,
 * where relevant, a text alignment hint) or null when the label should be
 * hidden. The caller is responsible for writing those values onto its Text
 * nodes; this module does not touch Scenery nodes.
 */
import type { Bounds2, Vector2 } from "scenerystack/dot";
import { equatorialToHorizontal } from "../../common/sky/SkyCoordinates.js";
import type { SkyProjection } from "./SkyProjection.js";

/** Maximum altitude (degrees) drawn on the alt/az grid (the zenith point). */
const ALT_AZ_GRID_ALT_MAX_DEG = 90;
/** Altitude (degrees) at which azimuth tick labels sit, just above the horizon. */
const AZ_GRID_LABEL_ALT_DEG = 4;
/** Screen inset so grid tick labels stay readable inside the panel. */
const GRID_LABEL_EDGE_INSET_PX = 14;
/** Dec sweep step (degrees) used when sampling for an RA hour label. */
const EQUATORIAL_SAMPLE_STEP_DEG = 5;
/** Dec sweep bounds (degrees) used when sampling for an RA hour label. */
const EQUATORIAL_GRID_DEC_MIN_DEG = -90;
const EQUATORIAL_GRID_DEC_MAX_DEG = 90;
/** Prefer RA labels near the celestial equator when it is in the FOV. */
const EQUATORIAL_RA_LABEL_DEC_PREF_DEG = 15;

/** Screen-space placement for a single grid label. */
export type LabelPlacement = {
  point: Vector2;
  /**
   * "left" → label sits with its left edge just right of the point (alt labels
   * stacked along the central meridian); "center" → label is centered on the
   * point (azimuth + equatorial labels).
   */
  align: "left" | "center";
};

/** True when `point` lies inside `bounds` shrunk by the standard label inset. */
const isLabelPointInBounds = (point: Vector2, bounds: Bounds2): boolean => {
  const inset = GRID_LABEL_EDGE_INSET_PX;
  return (
    point.x >= bounds.minX + inset &&
    point.x <= bounds.maxX - inset &&
    point.y >= bounds.minY + inset &&
    point.y <= bounds.maxY - inset
  );
};

/**
 * Places an altitude tick label along the central meridian (at the view's look
 * azimuth). Returns null for the horizon (alt 0°, labeled by cardinals), the
 * zenith (alt 90°, a degenerate point), or when the projected point falls
 * outside the inset bounds.
 */
export const placeAltitudeLabel = (
  projection: SkyProjection,
  bounds: Bounds2,
  altDeg: number,
): LabelPlacement | null => {
  if (altDeg <= 0 || altDeg >= ALT_AZ_GRID_ALT_MAX_DEG) {
    return null;
  }
  const point = projection.project(altDeg, projection.lookAzimuthDeg);
  if (!(point && isLabelPointInBounds(point, bounds))) {
    return null;
  }
  return { point, align: "left" };
};

/**
 * Places an azimuth tick label just above the horizon at the given azimuth.
 * Returns null when the projected point falls outside the inset bounds.
 */
export const placeAzimuthLabel = (projection: SkyProjection, bounds: Bounds2, azDeg: number): LabelPlacement | null => {
  const point = projection.project(AZ_GRID_LABEL_ALT_DEG, azDeg);
  if (!(point && isLabelPointInBounds(point, bounds))) {
    return null;
  }
  return { point, align: "center" };
};

/**
 * Projects a single (RA, Dec) sample to a screen point, returning null when it
 * is below the horizon (if hidden), outside the projection, or outside the
 * inset bounds. Shared by the RA and Dec label placers.
 */
const projectEquatorialLabelSample = (
  projection: SkyProjection,
  bounds: Bounds2,
  raHours: number,
  decDeg: number,
  lat: number,
  lst: number,
  hideBelowHorizon: boolean,
): Vector2 | null => {
  const { altDeg, azDeg } = equatorialToHorizontal(raHours, decDeg, lat, lst);
  if (hideBelowHorizon && altDeg < 0) {
    return null;
  }
  const point = projection.project(altDeg, azDeg);
  if (!(point && isLabelPointInBounds(point, bounds))) {
    return null;
  }
  return point;
};

/**
 * Best screen position for an RA-hour label: sweeps Dec from pole to pole and
 * prefers samples near the celestial equator (so hour labels sit on the equator
 * when it is in view) while breaking ties toward the FOV center. Returns null
 * when no sample projects into the inset bounds.
 */
export const bestEquatorialLabelPointForRa = (
  projection: SkyProjection,
  bounds: Bounds2,
  raHours: number,
  lat: number,
  lst: number,
  hideBelowHorizon: boolean,
  center: Vector2,
): Vector2 | null => {
  let best: Vector2 | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let dec = EQUATORIAL_GRID_DEC_MIN_DEG; dec <= EQUATORIAL_GRID_DEC_MAX_DEG; dec += EQUATORIAL_SAMPLE_STEP_DEG) {
    const point = projectEquatorialLabelSample(projection, bounds, raHours, dec, lat, lst, hideBelowHorizon);
    if (!point) {
      continue;
    }
    // Prefer samples near Dec = 0 so hour labels sit on the celestial equator when visible.
    const equatorPenalty = Math.abs(dec) / EQUATORIAL_RA_LABEL_DEC_PREF_DEG;
    const score = point.distanceSquared(center) + equatorPenalty * equatorPenalty * 400;
    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  }
  return best;
};

/**
 * Best screen position for a Dec label: sweeps RA around the clock and picks
 * the sample nearest the FOV center. Returns null when no sample projects into
 * the inset bounds.
 */
export const bestEquatorialLabelPointForDec = (
  projection: SkyProjection,
  bounds: Bounds2,
  decDeg: number,
  lat: number,
  lst: number,
  hideBelowHorizon: boolean,
  center: Vector2,
): Vector2 | null => {
  let best: Vector2 | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let raStep = 0; raStep < 360; raStep += EQUATORIAL_SAMPLE_STEP_DEG) {
    const ra = (raStep / 360) * 24;
    const point = projectEquatorialLabelSample(projection, bounds, ra, decDeg, lat, lst, hideBelowHorizon);
    if (!point) {
      continue;
    }
    const score = point.distanceSquared(center);
    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  }
  return best;
};
