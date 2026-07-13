/**
 * moonPhaseShape.ts
 *
 * Orthographic terminator geometry for the lunar disc. Pure kite Shape builder
 * used by PlanetariumPlanetsNode — no Scenery / model deps.
 *
 * Convention: waxing → illuminated on the right (+x); waning → on the left.
 * That matches the usual northern-hemisphere teaching diagram (not a full
 * parallactic rotation of the terminator).
 */

import { clamp } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";

/**
 * Unlit portion of a Moon disc centered at the origin.
 *
 * @param radius - Disc radius in view pixels.
 * @param phaseFraction - Illuminated fraction in [0, 1] (0 = new, 1 = full).
 * @param waxing - True between new and full (lit on the right).
 */
export const moonUnlitShape = (radius: number, phaseFraction: number, waxing: boolean): Shape => {
  const fraction = clamp(phaseFraction, 0, 1);

  if (fraction >= 1 - 1e-4) {
    return new Shape();
  }
  if (fraction <= 1e-4) {
    return Shape.circle(0, 0, radius);
  }

  // Dark limb is the left semicircle when waxing (lit on the right).
  const darkIsLeft = waxing;

  // Terminator is a vertical ellipse; width is 0 at quarter, radius at new/full.
  const ellipseRx = radius * Math.abs(2 * fraction - 1);
  const isGibbous = fraction > 0.5;

  // Crescent: terminator bows into the lit half. Gibbous: into the dark half.
  const terminatorOnLeft = isGibbous ? darkIsLeft : !darkIsLeft;

  const shape = new Shape();
  shape.moveTo(0, -radius);

  // Canvas/kite y-down: anticlockwise=true sweeps left (west) from top to bottom.
  shape.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2, darkIsLeft);

  if (ellipseRx < 1e-4) {
    // Exact quarter: straight terminator through the center.
    shape.lineTo(0, -radius);
  } else {
    // Close along the terminator ellipse from south back to north.
    // With scenery y-down, anticlockwise=true sweeps the *right* half from south→north,
    // so pass !terminatorOnLeft.
    shape.ellipticalArc(0, 0, ellipseRx, radius, 0, Math.PI / 2, -Math.PI / 2, !terminatorOnLeft);
  }

  shape.close();
  return shape;
};
