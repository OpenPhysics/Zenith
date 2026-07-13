/**
 * ZenithHotkeyData.ts
 *
 * Single source of truth for Planetarium keyboard shortcuts. Listeners and the
 * Keyboard Shortcuts dialog both derive from these HotkeyData instances.
 */

import { HotkeyData } from "scenerystack/scenery";

const ARROW_KEYS = ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"] as const;
const CTRL_HORIZONTAL_ARROW_KEYS = ["ctrl+arrowLeft", "ctrl+arrowRight"] as const;
const META_HORIZONTAL_ARROW_KEYS = ["meta+arrowLeft", "meta+arrowRight"] as const;
const SELECT_NEXT_KEYS = ["n"] as const;
const SELECT_PREVIOUS_KEYS = ["p"] as const;
const CLEAR_SELECTION_KEYS = ["escape"] as const;

const ZenithHotkeyData = {
  ARROW_KEYS,
  ADVANCE_CIVIL_TIME_KEYS: CTRL_HORIZONTAL_ARROW_KEYS,
  /** Listener also accepts Meta+arrows (macOS); help dialog documents Ctrl. */
  ADVANCE_CIVIL_TIME_LISTENER_KEYS: [...CTRL_HORIZONTAL_ARROW_KEYS, ...META_HORIZONTAL_ARROW_KEYS] as const,
  SELECT_NEXT_KEYS,
  SELECT_PREVIOUS_KEYS,
  CLEAR_SELECTION_KEYS,

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
   */
  ADVANCE_CIVIL_TIME: new HotkeyData({
    keys: [...CTRL_HORIZONTAL_ARROW_KEYS],
    repoName: "zenith",
    binderName: "Advance Civil Time",
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
} as const;

export default ZenithHotkeyData;
