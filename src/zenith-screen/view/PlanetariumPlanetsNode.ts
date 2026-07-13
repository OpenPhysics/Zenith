/**
 * PlanetariumPlanetsNode.ts
 *
 * Draws Sun / Moon / planet discs (and optional name labels) in the FOV using
 * the same alt/az → screen projection as stars. Ephemeris from PlanetEphemeris;
 * colors/sizes from SolarSystemBodies + ZenithColors.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { clamp, type Vector2 } from "scenerystack/dot";
import { Circle, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { allPlanetEquatorialStates, type PlanetBodyId } from "../../common/sky/PlanetEphemeris.js";
import { equatorialToHorizontal } from "../../common/sky/SkyCoordinates.js";
import { StringManager } from "../../i18n/StringManager.js";
import { STAR_MAG_BRIGHT } from "../../SimConstants.js";
import ZenithColors from "../../ZenithColors.js";
import { SOLAR_SYSTEM_BODIES, type SolarSystemBodyVisual } from "../model/SolarSystemBodies.js";
import type { ZenithModel } from "../model/ZenithModel.js";

const LABEL_FONT = new PhetFont(11);
const LABEL_OFFSET_X = 6;
const LABEL_OFFSET_Y = -4;
/** Magnitude treated as the faint end of planet disc scaling. */
const PLANET_MAG_FAINT = 8;

const BODY_COLOR: Record<PlanetBodyId, typeof ZenithColors.sunColorProperty> = {
  sun: ZenithColors.sunColorProperty,
  moon: ZenithColors.moonColorProperty,
  mercury: ZenithColors.mercuryColorProperty,
  venus: ZenithColors.venusColorProperty,
  mars: ZenithColors.marsColorProperty,
  jupiter: ZenithColors.jupiterColorProperty,
  saturn: ZenithColors.saturnColorProperty,
  uranus: ZenithColors.uranusColorProperty,
  neptune: ZenithColors.neptuneColorProperty,
};

type BodyNodes = {
  visual: SolarSystemBodyVisual;
  disc: Circle;
  label: Text;
};

export type PlanetariumPlanetsNodeOptions = {
  /** Projects horizontal coordinates into panel pixels; null if outside FOV. */
  projectAltAz: (altDeg: number, azDeg: number) => Vector2 | null;
};

export class PlanetariumPlanetsNode extends Node {
  private readonly model: ZenithModel;
  private readonly projectAltAz: PlanetariumPlanetsNodeOptions["projectAltAz"];
  private readonly bodyNodes: BodyNodes[];

  public constructor(model: ZenithModel, options: PlanetariumPlanetsNodeOptions) {
    super({ pickable: false });

    this.model = model;
    this.projectAltAz = options.projectAltAz;

    const bodies = StringManager.getInstance().getBodies();
    const nameProperty = (id: PlanetBodyId): TReadOnlyProperty<string> => {
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

    this.bodyNodes = SOLAR_SYSTEM_BODIES.map((visual) => {
      const disc = new Circle(visual.minDiscRadiusPx, {
        fill: BODY_COLOR[visual.id],
        stroke: ZenithColors.horizonColorProperty,
        lineWidth: 1,
        visible: false,
      });
      const label = new Text(nameProperty(visual.id), {
        font: LABEL_FONT,
        fill: ZenithColors.planetLabelColorProperty,
        visible: false,
        pickable: false,
      });
      return { visual, disc, label };
    });

    this.children = this.bodyNodes.flatMap(({ disc, label }) => [disc, label]);
  }

  /** Recompute disc positions from the current model / ephemeris state. */
  public redraw(): void {
    const showPlanets = this.model.showPlanetsProperty.value;
    this.visible = showPlanets;
    if (!showPlanets) {
      return;
    }

    const showLabels = this.model.showPlanetLabelsProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const lat = this.model.latitudeProperty.value;
    const lon = this.model.longitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const civilMs = this.model.civilTimeMsProperty.value;

    const states = allPlanetEquatorialStates(civilMs, lat, lon);

    for (const { visual, disc, label } of this.bodyNodes) {
      const entry = states.find((s) => s.bodyId === visual.id);
      if (!entry) {
        disc.visible = false;
        label.visible = false;
        continue;
      }

      const { altDeg, azDeg } = equatorialToHorizontal(entry.state.raHours, entry.state.decDeg, lat, lst);

      if (hideBelowHorizon && altDeg < 0) {
        disc.visible = false;
        label.visible = false;
        continue;
      }

      const point = this.projectAltAz(altDeg, azDeg);
      if (!point) {
        disc.visible = false;
        label.visible = false;
        continue;
      }

      const radius = this.discRadius(visual, entry.state.mag);
      disc.radius = radius;
      disc.center = point;
      disc.visible = true;

      if (showLabels && visual.preferLabel) {
        label.left = point.x + radius + LABEL_OFFSET_X;
        label.centerY = point.y + LABEL_OFFSET_Y;
        label.visible = true;
      } else {
        label.visible = false;
      }
    }
  }

  private discRadius(visual: SolarSystemBodyVisual, mag: number): number {
    const t = clamp((mag - STAR_MAG_BRIGHT) / (PLANET_MAG_FAINT - STAR_MAG_BRIGHT), 0, 1);
    return visual.maxDiscRadiusPx + (visual.minDiscRadiusPx - visual.maxDiscRadiusPx) * t;
  }
}
