/**
 * EpochPreset.ts
 *
 * Civil-time jump targets for classroom activities (solstices, equinoxes, and
 * the sim default). CUSTOM means the user scrubbed or played past a preset.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";
import { DEFAULT_CIVIL_TIME_MS } from "../../SimConstants.js";

export class EpochPreset extends EnumerationValue {
  public static readonly DEFAULT = new EpochPreset();
  public static readonly MARCH_EQUINOX = new EpochPreset();
  public static readonly JUNE_SOLSTICE = new EpochPreset();
  public static readonly SEPTEMBER_EQUINOX = new EpochPreset();
  public static readonly DECEMBER_SOLSTICE = new EpochPreset();
  public static readonly CUSTOM = new EpochPreset();

  public static readonly enumeration = new Enumeration(EpochPreset);
}

/**
 * UTC civil epochs for each named preset.
 * Solstice/equinox dates use ~18:00 UTC so daytime/night contrasts are visible
 * across a range of longitudes at teaching speeds.
 */
export const EPOCH_PRESET_CIVIL_MS = new Map<EpochPreset, number>([
  [EpochPreset.DEFAULT, DEFAULT_CIVIL_TIME_MS],
  [EpochPreset.MARCH_EQUINOX, Date.UTC(2024, 2, 20, 18, 0, 0)],
  [EpochPreset.JUNE_SOLSTICE, Date.UTC(2024, 5, 21, 18, 0, 0)],
  [EpochPreset.SEPTEMBER_EQUINOX, Date.UTC(2024, 8, 22, 18, 0, 0)],
  [EpochPreset.DECEMBER_SOLSTICE, Date.UTC(2024, 11, 21, 18, 0, 0)],
]);

export const DEFAULT_EPOCH_PRESET = EpochPreset.DEFAULT;
