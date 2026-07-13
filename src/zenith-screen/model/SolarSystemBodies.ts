/**
 * SolarSystemBodies.ts
 *
 * Visual metadata for planetarium discs, adapted from Stellarium Web Engine
 * `data/planets.ini` (color, approximate radius). Ephemeris lives in
 * PlanetEphemeris.ts — this file is display-only.
 */

import type { PlanetBodyId } from "../../common/sky/PlanetEphemeris.js";

export type SolarSystemBodyVisual = {
  readonly id: PlanetBodyId;
  /** RGB 0–1 from planets.ini, converted to CSS hex for ProfileColorProperty defaults. */
  readonly colorHex: string;
  /** Physical radius in km (for relative disc sizing). */
  readonly radiusKm: number;
  /** Prefer drawing a name label when this is true. */
  readonly preferLabel: boolean;
  /** Minimum screen radius (px) so faint outer planets stay visible. */
  readonly minDiscRadiusPx: number;
  /** Maximum screen radius (px). */
  readonly maxDiscRadiusPx: number;
};

/** Convert planets.ini RGB floats to #rrggbb. */
const rgbToHex = (r: number, g: number, b: number): string => {
  const toByte = (x: number): string =>
    Math.round(Math.max(0, Math.min(1, x)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
};

/**
 * Body visuals in paint order (Sun/Moon first for z-order preference when
 * overlapping — the view still draws in this array order).
 */
export const SOLAR_SYSTEM_BODIES: readonly SolarSystemBodyVisual[] = [
  {
    id: "sun",
    colorHex: rgbToHex(1.0, 0.98, 0.97),
    radiusKm: 696000,
    preferLabel: true,
    minDiscRadiusPx: 10,
    maxDiscRadiusPx: 22,
  },
  {
    id: "moon",
    colorHex: rgbToHex(1.0, 0.986, 0.968),
    radiusKm: 1738,
    preferLabel: true,
    minDiscRadiusPx: 8,
    maxDiscRadiusPx: 18,
  },
  {
    id: "mercury",
    colorHex: rgbToHex(1.0, 0.964, 0.914),
    radiusKm: 2440,
    preferLabel: false,
    minDiscRadiusPx: 3,
    maxDiscRadiusPx: 7,
  },
  {
    id: "venus",
    colorHex: rgbToHex(1.0, 0.96, 0.876),
    radiusKm: 6052,
    preferLabel: true,
    minDiscRadiusPx: 4,
    maxDiscRadiusPx: 9,
  },
  {
    id: "mars",
    colorHex: rgbToHex(1.0, 0.768, 0.504),
    radiusKm: 3394,
    preferLabel: true,
    minDiscRadiusPx: 3.5,
    maxDiscRadiusPx: 8,
  },
  {
    id: "jupiter",
    colorHex: rgbToHex(1.0, 0.983, 0.934),
    radiusKm: 69911,
    preferLabel: true,
    minDiscRadiusPx: 5,
    maxDiscRadiusPx: 12,
  },
  {
    id: "saturn",
    colorHex: rgbToHex(1.0, 0.955, 0.858),
    radiusKm: 58232,
    preferLabel: true,
    minDiscRadiusPx: 4.5,
    maxDiscRadiusPx: 11,
  },
  {
    id: "uranus",
    colorHex: rgbToHex(0.837, 0.959, 1.0),
    radiusKm: 25362,
    preferLabel: false,
    minDiscRadiusPx: 3,
    maxDiscRadiusPx: 7,
  },
  {
    id: "neptune",
    colorHex: rgbToHex(0.44, 0.582, 1.0),
    radiusKm: 24624,
    preferLabel: false,
    minDiscRadiusPx: 3,
    maxDiscRadiusPx: 7,
  },
] as const;

export const solarSystemBodyVisual = (id: PlanetBodyId): SolarSystemBodyVisual => {
  const found = SOLAR_SYSTEM_BODIES.find((b) => b.id === id);
  if (!found) {
    throw new Error(`Unknown solar-system body: ${id}`);
  }
  return found;
};
