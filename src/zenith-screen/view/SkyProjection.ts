/**
 * SkyProjection.ts
 *
 * Pure, immutable value object that maps horizontal (alt/az) coordinates into
 * panel pixels for an aim-able first-person sky camera, using a stereographic
 * (fisheye) azimuthal projection — the same projection Stellarium uses by
 * default. Constructed from the look direction, field of view, and view bounds;
 * holds no model or Scenery references, so it is trivially unit-testable (see
 * tests/SkyProjection.test.ts).
 *
 * How it works: the look direction defines a camera basis (forward F, screen
 * right, screen up). A sky point's unit vector is expressed in that basis
 * (x, y, z) with z toward the view center, then projected stereographically:
 *   sx = cx + 2·focal·x / (1 + z)
 *   sy = cy − 2·focal·y / (1 + z)
 * so z = 1 (the view center) maps to (cx, cy) and z → −1 (the antipode) diverges
 * to infinity (culled). Because it is a true spherical projection, altitude
 * circles and azimuth meridians converge to a point at the zenith when the
 * camera tilts up, and the horizon appears as a curve — no separate "zenith"
 * geometry is needed.
 */

import { type Bounds2, Vector2, Vector3 } from "scenerystack/dot";
import { altAzToVector3, normalizeDegrees } from "../../common/sky/SkyCoordinates.js";
import { PROJECTION_CULL_DEG } from "../../SimConstants.js";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const COS_CULL = Math.cos(PROJECTION_CULL_DEG * DEG_TO_RAD);

export type SkyProjectionParams = {
  bounds: Bounds2;
  lookAzimuthDeg: number;
  lookAltitudeDeg: number;
  /** Horizontal field of view in degrees. */
  fieldOfViewDeg: number;
};

export class SkyProjection {
  public readonly bounds: Bounds2;
  public readonly lookAzimuthDeg: number;
  public readonly lookAltitudeDeg: number;
  public readonly fieldOfViewDeg: number;
  public readonly centerX: number;
  public readonly centerY: number;

  /** Camera basis in the horizon frame (+X = N, +Y = E, +Z = zenith). */
  private readonly forward: Vector3;
  private readonly right: Vector3;
  private readonly up: Vector3;
  /** Focal length in pixels, derived from the horizontal FOV. */
  private readonly focalPx: number;

  public constructor(params: SkyProjectionParams) {
    this.bounds = params.bounds;
    this.lookAzimuthDeg = params.lookAzimuthDeg;
    this.lookAltitudeDeg = params.lookAltitudeDeg;
    this.fieldOfViewDeg = params.fieldOfViewDeg;
    const center = params.bounds.center;
    this.centerX = center.x;
    this.centerY = center.y;

    const azRad = params.lookAzimuthDeg * DEG_TO_RAD;
    // Forward points at the view center; right is horizontal (East-ward at az 0);
    // up = forward × right. Defining right from azimuth alone keeps the basis
    // well-defined even when looking straight up (no gimbal singularity).
    this.forward = altAzToVector3(params.lookAltitudeDeg, params.lookAzimuthDeg);
    this.right = new Vector3(-Math.sin(azRad), Math.cos(azRad), 0);
    this.up = this.forward.cross(this.right);

    const halfFovRad = (params.fieldOfViewDeg * DEG_TO_RAD) / 2;
    this.focalPx = params.bounds.width / (4 * Math.max(1e-6, Math.tan(halfFovRad / 2)));
  }

  /** Degrees per pixel of the local (conformal) scale at a sky direction. */
  public degreesPerPixelAt(altDeg: number, azDeg: number): number {
    const z = altAzToVector3(altDeg, azDeg).dot(this.forward);
    return (RAD_TO_DEG * (1 + z)) / (2 * this.focalPx);
  }

  /** Degrees per pixel at the view center (z = 1). */
  public degreesPerPixel(): number {
    return RAD_TO_DEG / this.focalPx;
  }

  /** Inverse of {@link project}: a panel pixel back to horizontal coordinates. */
  public unproject(point: Vector2): { altDeg: number; azDeg: number } {
    const u = (point.x - this.centerX) / (2 * this.focalPx);
    const v = -(point.y - this.centerY) / (2 * this.focalPx);
    const s = u * u + v * v;
    // Inverse stereographic: camera-frame unit vector from plane coords (u, v).
    const x = (2 * u) / (1 + s);
    const y = (2 * v) / (1 + s);
    const z = (1 - s) / (1 + s);
    const p = this.right.timesScalar(x).plus(this.up.timesScalar(y)).plus(this.forward.timesScalar(z));
    const altDeg = RAD_TO_DEG * Math.asin(Math.max(-1, Math.min(1, p.z)));
    const azDeg = normalizeDegrees(RAD_TO_DEG * Math.atan2(p.y, p.x));
    return { altDeg, azDeg };
  }

  /**
   * Projects a horizon-frame unit vector (+X north, +Y east, +Z zenith) to panel
   * pixels, or null when it is beyond {@link PROJECTION_CULL_DEG} of the view
   * center (near the antipode) or degenerate. This is the primitive the hot star /
   * line loops use directly (via {@link equatorialToHorizonVector}), skipping the
   * alt/az-degrees round-trip that {@link project} would otherwise incur.
   *
   * The `!(z > COS_CULL)` test also rejects a non-finite z (e.g. from a NaN
   * vector): left un-culled such points project to a non-finite pixel, which
   * makes Kite's Shape.lineTo/moveTo assert and throw — poisoning the model
   * notification that triggered the redraw.
   */
  public projectVector(p: Vector3): Vector2 | null {
    const z = p.dot(this.forward);
    if (!(z > COS_CULL)) {
      return null;
    }
    const k = (2 * this.focalPx) / (1 + z);
    return new Vector2(this.centerX + k * p.dot(this.right), this.centerY - k * p.dot(this.up));
  }

  /**
   * Projects horizontal coordinates to panel pixels, or null when the point is
   * beyond {@link PROJECTION_CULL_DEG} of the view center (near the antipode) or
   * degenerate (e.g. the azimuth singularity exactly at the zenith, where
   * equatorialToHorizontal divides by cos(alt) ≈ 0 and yields NaN).
   */
  public project(altDeg: number, azDeg: number): Vector2 | null {
    if (!(Number.isFinite(altDeg) && Number.isFinite(azDeg))) {
      return null;
    }
    return this.projectVector(altAzToVector3(altDeg, azDeg));
  }
}

/** Wrap look azimuth into [0, 360). */
export const wrapLookAzimuth = (azDeg: number): number => normalizeDegrees(azDeg);
