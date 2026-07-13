/**
 * ZenithColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import ZenithColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import ZenithColors from "../../ZenithColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: ZenithColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the ZenithColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import ZenithNamespace from "./ZenithNamespace.js";

const ZenithColors = {
  /**
   * Background color for the planetarium screen.
   * Near-black night sky in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(ZenithNamespace, "background", {
    default: "#050814",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Starlight cyan in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(ZenithNamespace, "accent", {
    default: "#7ec8ff",
    projector: "#0a1628",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep indigo in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(ZenithNamespace, "panelBackground", {
    default: "#0d1528",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Soft navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(ZenithNamespace, "panelBorder", {
    default: "#1e3a5f",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(ZenithNamespace, "text", {
    default: "#e8eef8",
    projector: "#1a1a1a",
  }),

  /**
   * Fill for stars and bright sky markers on the planetarium dome.
   * Warm white in default mode; dark charcoal in projector mode.
   */
  starColorProperty: new ProfileColorProperty(ZenithNamespace, "star", {
    default: "#f4f7ff",
    projector: "#222222",
  }),

  /**
   * Horizon / ground tone beneath the planetarium dome.
   * Deep silhouette in default mode; soft gray in projector mode.
   */
  horizonColorProperty: new ProfileColorProperty(ZenithNamespace, "horizon", {
    default: "#0a101c",
    projector: "#d0d0d0",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(ZenithNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(ZenithNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(ZenithNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),
};

export default ZenithColors;
