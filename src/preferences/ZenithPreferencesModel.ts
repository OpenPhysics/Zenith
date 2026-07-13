/**
 * ZenithPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Overlay toggles (star names, constellation lines, planet labels)
 * take their initial values from zenithQueryParameters and outlive Reset All.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import ZenithNamespace from "../ZenithNamespace.js";
import zenithQueryParameters from "./zenithQueryParameters.js";

export class ZenithPreferencesModel {
  /** Whether curated bright-star name labels are drawn. */
  public readonly showStarLabelsProperty: BooleanProperty;

  /** Whether classroom constellation stick figures are drawn. */
  public readonly showConstellationsProperty: BooleanProperty;

  /** Whether preferred planet name labels are drawn. */
  public readonly showPlanetLabelsProperty: BooleanProperty;

  /**
   * Whether the deeper Hipparcos star catalog (mag <= 7.5) replaces the
   * bright-star catalog during rendering.
   */
  public readonly deepStarCatalogProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.showStarLabelsProperty = new BooleanProperty(zenithQueryParameters.showStarLabels, {
      ...(tandem && { tandem: tandem.createTandem("showStarLabelsProperty") }),
    });
    this.showConstellationsProperty = new BooleanProperty(zenithQueryParameters.showConstellations, {
      ...(tandem && { tandem: tandem.createTandem("showConstellationsProperty") }),
    });
    this.showPlanetLabelsProperty = new BooleanProperty(zenithQueryParameters.showPlanetLabels, {
      ...(tandem && { tandem: tandem.createTandem("showPlanetLabelsProperty") }),
    });
    this.deepStarCatalogProperty = new BooleanProperty(zenithQueryParameters.deepStarCatalog, {
      ...(tandem && { tandem: tandem.createTandem("deepStarCatalogProperty") }),
    });
  }

  public reset(): void {
    this.showStarLabelsProperty.reset();
    this.showConstellationsProperty.reset();
    this.showPlanetLabelsProperty.reset();
    this.deepStarCatalogProperty.reset();
  }
}

ZenithNamespace.register("ZenithPreferencesModel", ZenithPreferencesModel);
