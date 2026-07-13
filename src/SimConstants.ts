/**
 * SimConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Angles for observer location and sky coordinates use degrees unless noted.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in ZenithColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import { Range } from "scenerystack/dot";
import ZenithNamespace from "./ZenithNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Default screen-space radius of the projected planetarium dome. */
export const DOME_RADIUS = 220;

// ── Observer / sky defaults ───────────────────────────────────────────────────

/** Default observer latitude (degrees, +N). Boulder, CO ≈ 40° N. */
export const DEFAULT_LATITUDE_DEG = 40;

/** Default observer longitude (degrees, +E). Boulder, CO ≈ 105° W. */
export const DEFAULT_LONGITUDE_DEG = -105;

/** Allowed observer latitude range (degrees). */
export const LATITUDE_RANGE = new Range(-90, 90);

/** Allowed observer longitude range (degrees). */
export const LONGITUDE_RANGE = new Range(-180, 180);

/**
 * Default local sidereal time at t = 0 (hours, [0, 24)).
 * Sidereal time advances with the simulation clock when the sky is playing.
 */
export const DEFAULT_LOCAL_SIDEREAL_TIME_HOURS = 0;

/** Hours of local sidereal time per second of simulation clock (1:1 real-time). */
export const SIDEREAL_HOURS_PER_SIM_SECOND = 1 / 3600;

/** Hours in one sidereal day. */
export const HOURS_PER_SIDEREAL_DAY = 24;

ZenithNamespace.register("SimConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  DOME_RADIUS,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  DEFAULT_LOCAL_SIDEREAL_TIME_HOURS,
  SIDEREAL_HOURS_PER_SIM_SECOND,
  HOURS_PER_SIDEREAL_DAY,
});
