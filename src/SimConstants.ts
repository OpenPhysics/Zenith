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

import { Dimension2, Range } from "scenerystack/dot";
import ZenithNamespace from "./ZenithNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Horizontal padding inside control panels. */
export const PANEL_X_MARGIN = 12;

/** Vertical padding inside control panels. */
export const PANEL_Y_MARGIN = 10;

/** Default font size (px) for labels on panel controls. */
export const CONTROL_FONT_SIZE = 12;

/** Font size (px) for bold panel section titles. */
export const PANEL_TITLE_FONT_SIZE = 12;

/** Side length (px) of checkbox boxes in control panels. */
export const CHECKBOX_BOX_WIDTH = 16;

/** Default vertical spacing between children inside a panel VBox. */
export const PANEL_CONTENT_SPACING = 6;

/** Track size for NumberControl sliders. */
export const NUMBER_CONTROL_SLIDER_TRACK_SIZE = new Dimension2(140, 3);

/** Thumb size shared by panel sliders and NumberControl sliders. */
export const SLIDER_THUMB_SIZE = new Dimension2(13, 26);

/** Width reserved for the right-hand control panel (px). */
export const CONTROL_PANEL_WIDTH = 250;

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
 * Default local sidereal time is derived from civil time + longitude at reset;
 * this constant is only used as a fallback before the first sync.
 */
export const DEFAULT_LOCAL_SIDEREAL_TIME_HOURS = 0;

/**
 * Hours of civil (and roughly sidereal) time advanced per second of simulation
 * clock at NORMAL speed. Educational rate so diurnal motion is visible.
 */
export const CIVIL_HOURS_PER_SIM_SECOND = 1;

/**
 * @deprecated Prefer CIVIL_HOURS_PER_SIM_SECOND — kept as alias for call sites
 * that still speak in sidereal-hour drag units.
 */
export const SIDEREAL_HOURS_PER_SIM_SECOND = CIVIL_HOURS_PER_SIM_SECOND;

/** Hours in one sidereal day. */
export const HOURS_PER_SIDEREAL_DAY = 24;

/**
 * Default civil epoch: 2024-06-21 18:00 UTC (≈ noon MDT, summer solstice).
 * Documented for ephemeris tests and Reset All.
 */
export const DEFAULT_CIVIL_TIME_MS = Date.UTC(2024, 5, 21, 18, 0, 0);

// ── First-person planetarium FOV ──────────────────────────────────────────────

/** Default look azimuth (degrees from North through East). Due south. */
export const DEFAULT_LOOK_AZIMUTH_DEG = 180;

/** Default look altitude at FOV center (degrees). */
export const DEFAULT_LOOK_ALTITUDE_DEG = 25;

/** Allowed look altitude range (degrees). */
export const LOOK_ALTITUDE_RANGE = new Range(-10, 89);

/** Default horizontal field of view (degrees). */
export const DEFAULT_FIELD_OF_VIEW_DEG = 90;

/** Allowed horizontal FOV range (degrees). */
export const FIELD_OF_VIEW_RANGE = new Range(40, 120);

/** Fraction of panel height below the horizon line (ground). */
export const GROUND_FRACTION = 0.15;

/** Margin (degrees) outside the FOV before a star is culled. */
export const FOV_MARGIN_DEG = 2;

/** Default magnitude cull — fainter stars are hidden. */
export const DEFAULT_MAGNITUDE_LIMIT = 5.5;

/** Allowed magnitude-limit range. */
export const MAGNITUDE_LIMIT_RANGE = new Range(1, 5.8);

/** Degrees of look pan per pixel of pointer drag. */
export const LOOK_PAN_DEG_PER_PIXEL = 0.25;

/** Degrees of look pan per keyboard arrow press. */
export const LOOK_PAN_KEYBOARD_STEP_DEG = 3;

/** Sidereal hours advanced per pixel of Ctrl-drag. */
export const TIME_DRAG_HOURS_PER_PIXEL = 0.02;

/** Sidereal hours advanced per Ctrl+arrow press. */
export const TIME_KEYBOARD_STEP_HOURS = 0.25;

/** Brightest star screen radius (px). */
export const STAR_RADIUS_MAX = 4.5;

/** Faintest visible star screen radius (px). */
export const STAR_RADIUS_MIN = 0.6;

/** Magnitude used as the bright end of radius scaling. */
export const STAR_MAG_BRIGHT = -1.5;

/** Default: draw twilight sky colors and wash out daytime stars. */
export const DEFAULT_SHOW_ATMOSPHERE = true;

/** Default: draw Sun / Moon / planets in the FOV. */
export const DEFAULT_SHOW_PLANETS = true;

/** Default: draw name labels for preferred bodies. */
export const DEFAULT_SHOW_PLANET_LABELS = true;

/** Default: draw curated bright-star name labels. */
export const DEFAULT_SHOW_STAR_LABELS = true;

/** Default: draw N/S/E/W (+ intercardinals) and zenith marker. */
export const DEFAULT_SHOW_CARDINALS = true;

/** Horizon altitude (degrees) used for cardinal direction labels. */
export const CARDINAL_LABEL_ALTITUDE_DEG = 2;

/** Screen inset (px) when pinning an off-FOV cardinal to a panel edge. */
export const CARDINAL_EDGE_INSET_PX = 10;

/** Default: draw the local meridian arc. */
export const DEFAULT_SHOW_MERIDIAN = true;

/** Default: equatorial RA/Dec grid off (altitude ticks remain the primary grid). */
export const DEFAULT_SHOW_EQUATORIAL_GRID = false;

/** Default: constellation stick figures off until the learner enables them. */
export const DEFAULT_SHOW_CONSTELLATIONS = false;

/** Max screen-pixel distance for click-to-select a sky object. */
export const SELECTION_HIT_RADIUS_PX = 18;

/** Equatorial grid: RA step in hours. */
export const EQUATORIAL_GRID_RA_STEP_HOURS = 2;

/** Equatorial grid: Dec step in degrees. */
export const EQUATORIAL_GRID_DEC_STEP_DEG = 15;

ZenithNamespace.register("SimConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  CONTROL_FONT_SIZE,
  CONTROL_PANEL_WIDTH,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  DEFAULT_LOCAL_SIDEREAL_TIME_HOURS,
  CIVIL_HOURS_PER_SIM_SECOND,
  SIDEREAL_HOURS_PER_SIM_SECOND,
  HOURS_PER_SIDEREAL_DAY,
  DEFAULT_CIVIL_TIME_MS,
  DEFAULT_LOOK_AZIMUTH_DEG,
  DEFAULT_LOOK_ALTITUDE_DEG,
  DEFAULT_FIELD_OF_VIEW_DEG,
  DEFAULT_MAGNITUDE_LIMIT,
  GROUND_FRACTION,
  DEFAULT_SHOW_ATMOSPHERE,
  DEFAULT_SHOW_PLANETS,
  DEFAULT_SHOW_PLANET_LABELS,
  DEFAULT_SHOW_STAR_LABELS,
  DEFAULT_SHOW_CARDINALS,
  CARDINAL_LABEL_ALTITUDE_DEG,
  CARDINAL_EDGE_INSET_PX,
  DEFAULT_SHOW_MERIDIAN,
  DEFAULT_SHOW_EQUATORIAL_GRID,
  DEFAULT_SHOW_CONSTELLATIONS,
  SELECTION_HIT_RADIUS_PX,
});
