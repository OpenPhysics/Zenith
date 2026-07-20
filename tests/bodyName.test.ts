/**
 * bodyName.test.ts
 *
 * Locks body-id → localized name Property mapping and reference identity.
 */

import { describe, expect, it } from "vitest";
import { bodyNameProperty } from "../src/common/bodyName.js";
import { PLANET_BODY_IDS, type PlanetBodyId } from "../src/common/sky/PlanetEphemeris.js";
import { StringManager } from "../src/i18n/StringManager.js";

const EXPECTED_EN: Record<PlanetBodyId, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
};

describe("bodyNameProperty", () => {
  it("returns the English name for every PlanetBodyId", () => {
    for (const id of PLANET_BODY_IDS) {
      expect(bodyNameProperty(id).value).toBe(EXPECTED_EN[id]);
    }
  });

  it("returns the same Property reference as StringManager.getBodies()", () => {
    const bodies = StringManager.getInstance().getBodies();
    expect(bodyNameProperty("sun")).toBe(bodies.sunStringProperty);
    expect(bodyNameProperty("moon")).toBe(bodies.moonStringProperty);
    expect(bodyNameProperty("neptune")).toBe(bodies.neptuneStringProperty);
  });

  it("is exhaustive over PLANET_BODY_IDS (compile-time + runtime)", () => {
    // If a new PlanetBodyId is added without updating bodyNameProperty, tsc fails
    // on the switch; this loop fails at runtime if PLANET_BODY_IDS grows without
    // EXPECTED_EN / the helper staying in sync.
    const ids: PlanetBodyId[] = [...PLANET_BODY_IDS];
    expect(ids).toHaveLength(9);
    for (const id of ids) {
      expect(bodyNameProperty(id).value.length).toBeGreaterThan(0);
    }
  });
});
