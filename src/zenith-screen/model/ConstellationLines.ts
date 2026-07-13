/**
 * ConstellationLines.ts
 *
 * Stick-figure segments for a small classroom set of constellations. Each
 * segment connects two named stars from NamedBrightStars by id.
 */

export type ConstellationId = "ursaMajor" | "orion" | "cassiopeia" | "southernCross";

export type ConstellationSegment = {
  readonly fromId: string;
  readonly toId: string;
};

export type ConstellationFigure = {
  readonly id: ConstellationId;
  readonly segments: readonly ConstellationSegment[];
};

/** Classroom staples — not the full IAU constellation set. */
export const CONSTELLATION_FIGURES: readonly ConstellationFigure[] = [
  {
    id: "ursaMajor",
    segments: [
      { fromId: "dubhe", toId: "merak" },
      { fromId: "merak", toId: "phecda" },
      { fromId: "phecda", toId: "megrez" },
      { fromId: "megrez", toId: "alioth" },
      { fromId: "alioth", toId: "mizar" },
      { fromId: "mizar", toId: "alkaid" },
      { fromId: "megrez", toId: "dubhe" },
    ],
  },
  {
    id: "orion",
    segments: [
      { fromId: "betelgeuse", toId: "bellatrix" },
      { fromId: "bellatrix", toId: "mintaka" },
      { fromId: "mintaka", toId: "alnilam" },
      { fromId: "alnilam", toId: "alnitak" },
      { fromId: "alnitak", toId: "saiph" },
      { fromId: "saiph", toId: "rigel" },
      { fromId: "rigel", toId: "mintaka" },
      { fromId: "betelgeuse", toId: "alnitak" },
    ],
  },
  {
    id: "cassiopeia",
    segments: [
      { fromId: "caph", toId: "schedar" },
      { fromId: "schedar", toId: "gammaCas" },
      { fromId: "gammaCas", toId: "ruchbah" },
      { fromId: "ruchbah", toId: "segin" },
    ],
  },
  {
    id: "southernCross",
    segments: [
      { fromId: "acrux", toId: "gacrux" },
      { fromId: "mimosa", toId: "deltaCru" },
    ],
  },
];
