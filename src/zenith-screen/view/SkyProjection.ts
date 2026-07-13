/**
 * SkyProjection.ts
 *
 * Pure, immutable value object that maps horizontal (alt/az) coordinates into
 * panel pixels for the first-person FOV. Constructed from the current look
 * direction, horizontal field of view, and view bounds; holds no model or
 * Scenery references, so it is trivially unit-testable (see
 * tests/SkyProjection.test.ts).
 *
 * Screen mapping (degrees → pixels), centered on look az/alt. `fieldOfViewDeg`
 * is the horizontal FOV; the vertical FOV scales with the view aspect ratio so
 * degrees-per-pixel are equal in X and Y (isomorphic under zoom / resize):
 *   fovY = fovX · (height / width)
 *   x = minX + width  · (azOffset + fovX/2) / fovX
 *   y = maxY − height · (alt − altMin) / (altMax − altMin)
 * with altMax/Min = lookAlt ± fovY/2.
 */

import { type Bounds2, Vector2 } from "scenerystack/dot";
import { normalizeDegrees } from "../../common/sky/SkyCoordinates.js";
import { FOV_MARGIN_DEG } from "../../SimConstants.js";

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
  /** Altitude (degrees) at the bottom / top of the visible FOV. */
  public readonly altMin: number;
  public readonly altMax: number;

  public constructor(params: SkyProjectionParams) {
    this.bounds = params.bounds;
    this.lookAzimuthDeg = params.lookAzimuthDeg;
    this.lookAltitudeDeg = params.lookAltitudeDeg;
    this.fieldOfViewDeg = params.fieldOfViewDeg;

    const fovY = verticalFieldOfViewDeg(params.fieldOfViewDeg, params.bounds.width, params.bounds.height);
    this.altMax = params.lookAltitudeDeg + fovY / 2;
    this.altMin = params.lookAltitudeDeg - fovY / 2;
  }

  /** Horizontal degrees per view pixel (FOV / panel width). */
  public degreesPerPixel(): number {
    return this.fieldOfViewDeg / Math.max(1, this.bounds.width);
  }

  /** Signed azimuth offset (degrees) from the look direction, wrapped to [−180, 180). */
  public azOffset(azDeg: number): number {
    return ((azDeg - this.lookAzimuthDeg + 540) % 360) - 180;
  }

  public azToX(azDeg: number): number {
    const b = this.bounds;
    const u = (this.azOffset(azDeg) + this.fieldOfViewDeg / 2) / this.fieldOfViewDeg;
    return b.minX + u * b.width;
  }

  public altToY(altDeg: number): number {
    const b = this.bounds;
    const v = (altDeg - this.altMin) / (this.altMax - this.altMin);
    return b.maxY - v * b.height;
  }

  /**
   * Projects horizontal coordinates to panel pixels, or null when the point is
   * outside the FOV (with a small {@link FOV_MARGIN_DEG} cull margin).
   */
  public project(altDeg: number, azDeg: number): Vector2 | null {
    const dAz = this.azOffset(azDeg);
    if (Math.abs(dAz) > this.fieldOfViewDeg / 2 + FOV_MARGIN_DEG) {
      return null;
    }
    if (altDeg < this.altMin - FOV_MARGIN_DEG || altDeg > this.altMax + FOV_MARGIN_DEG) {
      return null;
    }
    return new Vector2(this.azToX(azDeg), this.altToY(altDeg));
  }
}

/** Wrap look azimuth into [0, 360). */
export const wrapLookAzimuth = (azDeg: number): number => normalizeDegrees(azDeg);

/**
 * Vertical FOV (degrees) matching horizontal degrees-per-pixel across the view.
 * Keeps az/alt screen scale isomorphic when zooming or changing aspect ratio.
 */
export const verticalFieldOfViewDeg = (horizontalFovDeg: number, viewWidth: number, viewHeight: number): number => {
  if (viewWidth <= 0) {
    return horizontalFovDeg;
  }
  return horizontalFovDeg * (viewHeight / viewWidth);
};
