/**
 * ZenithHotkeyData.ts
 *
 * Single source of truth for Planetarium keyboard shortcuts. Listeners and the
 * Keyboard Shortcuts dialog both derive from these HotkeyData instances.
 *
 * Key names follow scenery's `EnglishStringToCodeMap` (lowercase letters and
 * named keys like `plus`, `minus`, `equals`). Note that `plus` and `equals`
 * share the same physical key (code `Equal`), so they are never assigned to two
 * different actions.
 */

import { HotkeyData } from "scenerystack/scenery";

const ARROW_KEYS = ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"] as const;
const CTRL_HORIZONTAL_ARROW_KEYS = ["ctrl+arrowLeft", "ctrl+arrowRight"] as const;
const META_HORIZONTAL_ARROW_KEYS = ["meta+arrowLeft", "meta+arrowRight"] as const;
const SELECT_NEXT_KEYS = ["n"] as const;
const SELECT_PREVIOUS_KEYS = ["p"] as const;
const CLEAR_SELECTION_KEYS = ["escape"] as const;

const ZenithHotkeyData = {
  /**
   * Pan look azimuth / altitude (arrow keys), matching plain drag.
   */
  LOOK_PAN: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: "zenith",
    binderName: "Pan Look Direction",
  }),

  /**
   * Advance / rewind civil time (Ctrl + left/right), matching Ctrl-drag.
   * Documented in the keyboard-help dialog (Meta is macOS-only, see listener).
   */
  ADVANCE_CIVIL_TIME: new HotkeyData({
    keys: [...CTRL_HORIZONTAL_ARROW_KEYS],
    repoName: "zenith",
    binderName: "Advance Civil Time",
  }),

  /**
   * Same as {@link ADVANCE_CIVIL_TIME}, plus Meta+arrows for macOS.
   * Used by the focused sky KeyboardListener; help dialog documents Ctrl only.
   */
  ADVANCE_CIVIL_TIME_LISTENER: new HotkeyData({
    keys: [...CTRL_HORIZONTAL_ARROW_KEYS, ...META_HORIZONTAL_ARROW_KEYS],
    repoName: "zenith",
    binderName: "Advance Civil Time (with Meta)",
  }),

  /**
   * Select the next named star or planet currently in the FOV.
   */
  SELECT_NEXT: new HotkeyData({
    keys: [...SELECT_NEXT_KEYS],
    repoName: "zenith",
    binderName: "Select Next Sky Object",
  }),

  /**
   * Select the previous named star or planet currently in the FOV.
   */
  SELECT_PREVIOUS: new HotkeyData({
    keys: [...SELECT_PREVIOUS_KEYS],
    repoName: "zenith",
    binderName: "Select Previous Sky Object",
  }),

  /**
   * Clear the selected star or planet.
   */
  CLEAR_SELECTION: new HotkeyData({
    keys: [...CLEAR_SELECTION_KEYS],
    repoName: "zenith",
    binderName: "Clear Selection",
  }),

  /**
   * Toggle tracking: keep the camera centered on the selected object as time passes.
   */
  TRACK_OBJECT: new HotkeyData({
    keys: ["t"],
    repoName: "zenith",
    binderName: "Track Selected Object",
  }),

  // ── Field of view ──────────────────────────────────────────────────────────

  /**
   * Narrow the field of view (zoom in). `plus` is the `Equal` physical key.
   */
  ZOOM_IN: new HotkeyData({
    keys: ["plus"],
    repoName: "zenith",
    binderName: "Zoom In",
  }),

  /**
   * Widen the field of view (zoom out).
   */
  ZOOM_OUT: new HotkeyData({
    keys: ["minus"],
    repoName: "zenith",
    binderName: "Zoom Out",
  }),

  // ── Quick-look directions (Shift + cardinal letter) ─────────────────────────

  LOOK_NORTH: new HotkeyData({
    keys: ["shift+n"],
    repoName: "zenith",
    binderName: "Look North",
  }),
  LOOK_SOUTH: new HotkeyData({
    keys: ["shift+s"],
    repoName: "zenith",
    binderName: "Look South",
  }),
  LOOK_EAST: new HotkeyData({
    keys: ["shift+e"],
    repoName: "zenith",
    binderName: "Look East",
  }),
  LOOK_WEST: new HotkeyData({
    keys: ["shift+w"],
    repoName: "zenith",
    binderName: "Look West",
  }),
  LOOK_ZENITH: new HotkeyData({
    keys: ["shift+z"],
    repoName: "zenith",
    binderName: "Look Zenith",
  }),

  // ── Time rate (Stellarium-style J / K / L) ─────────────────────────────────

  /** Step the playback rate one notch toward reverse / slower. */
  TIME_SLOWER: new HotkeyData({
    keys: ["j"],
    repoName: "zenith",
    binderName: "Decrease Time Rate",
  }),

  /** Restore the playback rate to normal forward (1×). */
  TIME_NORMAL: new HotkeyData({
    keys: ["k"],
    repoName: "zenith",
    binderName: "Normal Time Rate",
  }),

  /** Step the playback rate one notch toward faster forward. */
  TIME_FASTER: new HotkeyData({
    keys: ["l"],
    repoName: "zenith",
    binderName: "Increase Time Rate",
  }),

  /** Advance the clock by one sidereal day. */
  TIME_DAY_FORWARD: new HotkeyData({
    keys: ["shift+plus"],
    repoName: "zenith",
    binderName: "Advance One Sidereal Day",
  }),

  /** Rewind the clock by one sidereal day. */
  TIME_DAY_BACKWARD: new HotkeyData({
    keys: ["shift+minus"],
    repoName: "zenith",
    binderName: "Rewind One Sidereal Day",
  }),

  // ── Display option toggles ─────────────────────────────────────────────────

  TOGGLE_ATMOSPHERE: new HotkeyData({
    keys: ["a"],
    repoName: "zenith",
    binderName: "Toggle Atmosphere",
  }),
  TOGGLE_HORIZON: new HotkeyData({
    keys: ["g"],
    repoName: "zenith",
    binderName: "Toggle Horizon",
  }),
  TOGGLE_CARDINALS: new HotkeyData({
    keys: ["q"],
    repoName: "zenith",
    binderName: "Toggle Cardinals",
  }),
  TOGGLE_GRID: new HotkeyData({
    keys: ["z"],
    repoName: "zenith",
    binderName: "Toggle Alt-Az Grid",
  }),
  TOGGLE_EQUATORIAL_GRID: new HotkeyData({
    keys: ["e"],
    repoName: "zenith",
    binderName: "Toggle Equatorial Grid",
  }),
  TOGGLE_MERIDIAN: new HotkeyData({
    keys: ["m"],
    repoName: "zenith",
    binderName: "Toggle Meridian",
  }),
} as const;

export default ZenithHotkeyData;
