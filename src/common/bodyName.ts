/**
 * bodyName.ts
 *
 * Centralized lookup from a solar-system body id to its localized name
 * property. Replaces the body-id → `bodies.*StringProperty` switch statements
 * that were duplicated in `SelectedObjectReadout`, `PlanetariumPlanetsNode`,
 * and the computed-key access in `attachPlanetariumInteraction`. The switch is
 * exhaustive over {@link PlanetBodyId}, so adding a new body fails to
 * typecheck here until it's wired up.
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { StringManager } from "../i18n/StringManager.js";
import type { PlanetBodyId } from "./sky/PlanetEphemeris.js";

/**
 * The localized name property for `id`. Returns the same `ReadOnlyProperty`
 * reference each call would have returned inline (e.g. `bodies.sunStringProperty`).
 */
export const bodyNameProperty = (id: PlanetBodyId): TReadOnlyProperty<string> => {
  const bodies = StringManager.getInstance().getBodies();
  switch (id) {
    case "sun":
      return bodies.sunStringProperty;
    case "moon":
      return bodies.moonStringProperty;
    case "mercury":
      return bodies.mercuryStringProperty;
    case "venus":
      return bodies.venusStringProperty;
    case "mars":
      return bodies.marsStringProperty;
    case "jupiter":
      return bodies.jupiterStringProperty;
    case "saturn":
      return bodies.saturnStringProperty;
    case "uranus":
      return bodies.uranusStringProperty;
    case "neptune":
      return bodies.neptuneStringProperty;
  }
};
