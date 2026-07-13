/**
 * PlanetariumSkyNode.ts
 *
 * First-person rectangular FOV looking out from an Earth observer. Stars from
 * the bright-star catalog are projected via equatorial → horizontal → screen
 * pixels. Look direction and FOV are continuous Properties on ZenithModel.
 * Optional overlays include an alt/az grid with tick labels, meridian, cardinals,
 * and an RA/Dec grid with hour/declination tick labels.
 *
 * Screen mapping (degrees → pixels), centered on look az/alt. `fieldOfViewDeg`
 * is the horizontal FOV; vertical FOV scales with the view aspect ratio so
 * degrees-per-pixel are equal in X and Y (isomorphic under zoom / resize):
 *   fovY = fovX · (height / width)
 *   x = left + width  · (az − lookAz + fovX/2) / fovX
 *   y = top  + height · (1 − (alt − altMin) / (altMax − altMin))
 * with altMax/Min = lookAlt ± fovY/2.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { type Bounds2, clamp, type Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, LinearGradient, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { equatorialToHorizontal, normalizeDegrees } from "../../common/sky/SkyCoordinates.js";
import { ASTRONOMICAL_TWILIGHT_DEG, effectiveStarVisibility, twilightSkyColors } from "../../common/sky/SkyTwilight.js";
import { StringManager } from "../../i18n/StringManager.js";
import {
  ALT_AZ_GRID_ALT_MAX_DEG,
  ALT_AZ_GRID_ALT_MIN_DEG,
  ALT_AZ_GRID_ALT_STEP_DEG,
  ALT_AZ_GRID_AZ_STEP_DEG,
  CARDINAL_EDGE_INSET_PX,
  CARDINAL_LABEL_ALTITUDE_DEG,
  EQUATORIAL_GRID_DEC_MAX_DEG,
  EQUATORIAL_GRID_DEC_MIN_DEG,
  EQUATORIAL_GRID_DEC_STEP_DEG,
  EQUATORIAL_GRID_PARALLEL_DEC_MAX_DEG,
  EQUATORIAL_GRID_PARALLEL_DEC_MIN_DEG,
  EQUATORIAL_GRID_RA_STEP_HOURS,
  SELECTION_HIT_RADIUS_PX,
  STAR_MAG_BRIGHT,
  STAR_RADIUS_MAX,
  STAR_RADIUS_MIN,
} from "../../SimConstants.js";
import ZenithColors from "../../ZenithColors.js";
import {
  BRIGHT_STAR_COUNT,
  BRIGHT_STAR_DEC_DEG,
  BRIGHT_STAR_MAG,
  BRIGHT_STAR_RA_HOURS,
} from "../model/BrightStarCatalog.js";
import { CONSTELLATION_FIGURES, type ConstellationId, constellationStarById } from "../model/ConstellationLines.js";
import { getDeepStarData } from "../model/DeepStarCatalog.js";
import { NAMED_BRIGHT_STARS, namedStarById } from "../model/NamedBrightStars.js";
import type { SelectedSkyObject } from "../model/SelectedSkyObject.js";
import { solarSystemBodyVisual } from "../model/SolarSystemBodies.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import { PlanetariumPlanetsNode } from "./PlanetariumPlanetsNode.js";
import { SkyProjection } from "./SkyProjection.js";

const LABEL_FONT = new PhetFont(11);
const GRID_LABEL_FONT = new PhetFont({ size: 11, weight: "bold" });
const CONSTELLATION_LABEL_FONT = new PhetFont({ size: 13, weight: "bold" });
const CARDINAL_FONT = new PhetFont({ size: 14, weight: "bold" });
const LABEL_OFFSET_X = 6;
const LABEL_OFFSET_Y = -4;
const MERIDIAN_ALT_STEP_DEG = 5;
const EQUATORIAL_SAMPLE_STEP_DEG = 5;
/** Prefer RA labels near the celestial equator when it is in the FOV. */
const EQUATORIAL_RA_LABEL_DEC_PREF_DEG = 15;
/** Screen inset so grid tick labels stay readable inside the panel. */
const GRID_LABEL_EDGE_INSET_PX = 14;
/** Alt labels sit this far from the left FOV edge (px). */
const ALT_LABEL_LEFT_INSET_PX = 22;
/** Az labels sit this far above the visible sky bottom (px). */
const AZ_LABEL_BOTTOM_INSET_PX = 16;
/** Extra radius (px) so the selection ring sits just outside the object disc. */
const SELECTION_RING_PADDING_PX = 4;
/** Altitude (degrees) at which the zenith marker is drawn (just shy of true zenith). */
const ZENITH_MARKER_ALTITUDE_DEG = 89;
/** Stars dimmer than this effective visibility are not click/keyboard selectable. */
const STAR_SELECTABLE_MIN_VISIBILITY = 0.05;
/** Constellation name labels appear only above this effective star visibility. */
const CONSTELLATION_LABEL_MIN_VISIBILITY = 0.15;
/** Below this effective star visibility, stars and constellation lines are not drawn. */
const STAR_RENDER_MIN_VISIBILITY = 0.02;

const formatRaTickLabel = (raHours: number): string => `${raHours}h`;

const formatDecTickLabel = (decDeg: number): string => {
  if (decDeg > 0) {
    return `+${decDeg}°`;
  }
  if (decDeg < 0) {
    return `−${Math.abs(decDeg)}°`;
  }
  return "0°";
};

const formatAltAzTickLabel = (deg: number): string => `${deg}°`;

export type PlanetariumSkyNodeOptions = {
  bounds: Bounds2;
};

type StarLabelNode = {
  starId: string;
  label: Text;
};

type ConstellationLabelNode = {
  id: ConstellationId;
  label: Text;
};

type EquatorialTickLabelNode = {
  kind: "ra" | "dec";
  value: number;
  label: Text;
};

type HorizontalTickLabelNode = {
  kind: "alt" | "az";
  value: number;
  label: Text;
};

export class PlanetariumSkyNode extends Node {
  private readonly model: ZenithModel;
  private bounds2: Bounds2;
  private projection: SkyProjection;

  private readonly skyFill: Rectangle;
  private readonly groundFill: Path;
  private readonly horizonLine: Path;
  private readonly equatorialGridPath: Path;
  private readonly equatorialLabelsLayer: Node;
  private readonly equatorialTickLabels: EquatorialTickLabelNode[];
  private readonly constellationPath: Path;
  private readonly constellationLabelsLayer: Node;
  private readonly constellationLabelNodes: ConstellationLabelNode[];
  private readonly gridPath: Path;
  private readonly horizontalLabelsLayer: Node;
  private readonly horizontalTickLabels: HorizontalTickLabelNode[];
  private readonly meridianPath: Path;
  private readonly starsPath: Path;
  private readonly planetsNode: PlanetariumPlanetsNode;
  private readonly starLabelsLayer: Node;
  private readonly starLabelNodes: StarLabelNode[];
  private readonly cardinalLabels: {
    north: Text;
    south: Text;
    east: Text;
    west: Text;
    northeast: Text;
    southeast: Text;
    southwest: Text;
    northwest: Text;
    zenith: Text;
  };
  private readonly selectionRing: Circle;

  public constructor(model: ZenithModel, options: PlanetariumSkyNodeOptions) {
    super({ pickable: true });

    this.model = model;
    this.bounds2 = options.bounds;

    this.skyFill = new Rectangle(0, 0, 1, 1, {
      fill: ZenithColors.skyPanelColorProperty.value,
    });
    this.groundFill = new Path(null, { fill: ZenithColors.groundColorProperty.value });
    this.horizonLine = new Path(null, {
      stroke: ZenithColors.horizonColorProperty,
      lineWidth: 2,
    });
    this.equatorialGridPath = new Path(null, {
      stroke: ZenithColors.equatorialGridColorProperty,
      lineWidth: 1,
      opacity: 0.45,
      pickable: false,
    });

    const equatorialTickLabels: EquatorialTickLabelNode[] = [];
    for (let ra = 0; ra < 24; ra += EQUATORIAL_GRID_RA_STEP_HOURS) {
      equatorialTickLabels.push({
        kind: "ra",
        value: ra,
        label: new Text(formatRaTickLabel(ra), {
          font: GRID_LABEL_FONT,
          fill: ZenithColors.equatorialGridLabelColorProperty,
          visible: false,
          pickable: false,
          opacity: 0.9,
        }),
      });
    }
    for (
      let dec = EQUATORIAL_GRID_PARALLEL_DEC_MIN_DEG;
      dec <= EQUATORIAL_GRID_PARALLEL_DEC_MAX_DEG;
      dec += EQUATORIAL_GRID_DEC_STEP_DEG
    ) {
      equatorialTickLabels.push({
        kind: "dec",
        value: dec,
        label: new Text(formatDecTickLabel(dec), {
          font: GRID_LABEL_FONT,
          fill: ZenithColors.equatorialGridLabelColorProperty,
          visible: false,
          pickable: false,
          opacity: 0.9,
        }),
      });
    }
    this.equatorialTickLabels = equatorialTickLabels;
    this.equatorialLabelsLayer = new Node({
      children: equatorialTickLabels.map((n) => n.label),
      pickable: false,
    });

    this.constellationPath = new Path(null, {
      stroke: ZenithColors.constellationColorProperty,
      lineWidth: 1.5,
      opacity: 0.85,
      pickable: false,
    });
    this.gridPath = new Path(null, {
      stroke: ZenithColors.gridColorProperty,
      lineWidth: 1,
      opacity: 0.55,
      pickable: false,
    });

    const horizontalTickLabels: HorizontalTickLabelNode[] = [];
    for (let alt = ALT_AZ_GRID_ALT_MIN_DEG; alt <= ALT_AZ_GRID_ALT_MAX_DEG; alt += ALT_AZ_GRID_ALT_STEP_DEG) {
      horizontalTickLabels.push({
        kind: "alt",
        value: alt,
        label: new Text(formatAltAzTickLabel(alt), {
          font: GRID_LABEL_FONT,
          fill: ZenithColors.gridLabelColorProperty,
          visible: false,
          pickable: false,
          opacity: 0.9,
        }),
      });
    }
    for (let az = 0; az < 360; az += ALT_AZ_GRID_AZ_STEP_DEG) {
      horizontalTickLabels.push({
        kind: "az",
        value: az,
        label: new Text(formatAltAzTickLabel(az), {
          font: GRID_LABEL_FONT,
          fill: ZenithColors.gridLabelColorProperty,
          visible: false,
          pickable: false,
          opacity: 0.9,
        }),
      });
    }
    this.horizontalTickLabels = horizontalTickLabels;
    this.horizontalLabelsLayer = new Node({
      children: horizontalTickLabels.map((n) => n.label),
      pickable: false,
    });

    this.meridianPath = new Path(null, {
      stroke: ZenithColors.meridianColorProperty,
      lineWidth: 1.5,
      opacity: 0.75,
      pickable: false,
    });
    this.starsPath = new Path(null, {
      fill: ZenithColors.starColorProperty,
      pickable: false,
    });
    this.planetsNode = new PlanetariumPlanetsNode(model);

    const stars = StringManager.getInstance().getStars();
    const starNameProperty = (id: string): TReadOnlyProperty<string> => {
      const key = `${id}StringProperty` as keyof typeof stars;
      return stars[key] as TReadOnlyProperty<string>;
    };

    this.starLabelNodes = NAMED_BRIGHT_STARS.map((star) => ({
      starId: star.id,
      label: new Text(starNameProperty(star.id), {
        font: LABEL_FONT,
        fill: ZenithColors.starLabelColorProperty,
        visible: false,
        pickable: false,
      }),
    }));
    this.starLabelsLayer = new Node({
      children: this.starLabelNodes.map((n) => n.label),
      pickable: false,
    });

    const constellations = StringManager.getInstance().getConstellations();
    const constellationNameProperty = (id: ConstellationId): TReadOnlyProperty<string> => {
      const key = `${id}StringProperty` as keyof typeof constellations;
      return constellations[key] as TReadOnlyProperty<string>;
    };
    this.constellationLabelNodes = CONSTELLATION_FIGURES.map((figure) => ({
      id: figure.id,
      label: new Text(constellationNameProperty(figure.id), {
        font: CONSTELLATION_LABEL_FONT,
        fill: ZenithColors.constellationLabelColorProperty,
        visible: false,
        pickable: false,
        opacity: 0.9,
      }),
    }));
    this.constellationLabelsLayer = new Node({
      children: this.constellationLabelNodes.map((n) => n.label),
      pickable: false,
    });

    const cardinals = StringManager.getInstance().getCardinals();
    const cardinalText = (property: TReadOnlyProperty<string>): Text =>
      new Text(property, {
        font: CARDINAL_FONT,
        fill: ZenithColors.accentColorProperty,
        visible: false,
        pickable: false,
      });
    this.cardinalLabels = {
      north: cardinalText(cardinals.northStringProperty),
      south: cardinalText(cardinals.southStringProperty),
      east: cardinalText(cardinals.eastStringProperty),
      west: cardinalText(cardinals.westStringProperty),
      northeast: cardinalText(cardinals.northeastStringProperty),
      southeast: cardinalText(cardinals.southeastStringProperty),
      southwest: cardinalText(cardinals.southwestStringProperty),
      northwest: cardinalText(cardinals.northwestStringProperty),
      zenith: cardinalText(cardinals.zenithStringProperty),
    };

    this.selectionRing = new Circle(10, {
      stroke: ZenithColors.selectionColorProperty,
      lineWidth: 2,
      visible: false,
      pickable: false,
    });

    this.children = [
      this.skyFill,
      this.groundFill,
      this.horizonLine,
      this.equatorialGridPath,
      this.equatorialLabelsLayer,
      this.constellationPath,
      this.constellationLabelsLayer,
      this.gridPath,
      this.horizontalLabelsLayer,
      this.meridianPath,
      this.starsPath,
      this.planetsNode,
      this.starLabelsLayer,
      this.cardinalLabels.north,
      this.cardinalLabels.northeast,
      this.cardinalLabels.east,
      this.cardinalLabels.southeast,
      this.cardinalLabels.south,
      this.cardinalLabels.southwest,
      this.cardinalLabels.west,
      this.cardinalLabels.northwest,
      this.cardinalLabels.zenith,
      this.selectionRing,
    ];

    const redrawDependencies = [
      model.latitudeProperty,
      model.longitudeProperty,
      model.civilTimeMsProperty,
      model.localSiderealTimeHoursProperty,
      model.solarAltitudeDegProperty,
      model.lookAzimuthDegProperty,
      model.lookAltitudeDegProperty,
      model.fieldOfViewDegProperty,
      model.showGridProperty,
      model.showCardinalsProperty,
      model.showMeridianProperty,
      model.showEquatorialGridProperty,
      model.showHorizonProperty,
      model.showAtmosphereProperty,
      model.showPlanetsProperty,
      model.trueScaleBodiesProperty,
      model.showPlanetLabelsProperty,
      model.showStarLabelsProperty,
      model.showConstellationsProperty,
      model.deepStarCatalogProperty,
      model.magnitudeLimitProperty,
      model.selectedObjectProperty,
      ZenithColors.skyPanelColorProperty,
      ZenithColors.skyNightHorizonColorProperty,
      ZenithColors.skyDayZenithColorProperty,
      ZenithColors.skyDayHorizonColorProperty,
      ZenithColors.skyTwilightHorizonColorProperty,
      ZenithColors.groundColorProperty,
      ZenithColors.groundDayColorProperty,
    ] as const;

    // Multilink is capped at 15 deps; wire redraw via individual lazyLinks.
    for (const property of redrawDependencies) {
      property.lazyLink(() => this.redraw());
    }

    this.projection = this.buildProjection();
    this.redraw();
  }

  /** Repositions the panel after layout changes. */
  public setViewBounds(bounds: Bounds2): void {
    this.bounds2 = bounds;
    this.redraw();
  }

  public getViewBounds(): Bounds2 {
    return this.bounds2;
  }

  /**
   * Finds the nearest named star or planet to a view-coordinate click, within
   * {@link SELECTION_HIT_RADIUS_PX}. Returns null if nothing is close enough.
   */
  public findNearestObject(viewPoint: Vector2): SelectedSkyObject | null {
    let best: SelectedSkyObject | null = null;
    let bestDistSq = SELECTION_HIT_RADIUS_PX * SELECTION_HIT_RADIUS_PX;

    for (const object of this.listSelectableObjectsInView()) {
      const point = this.projectSelectedObject(object);
      if (!point) {
        continue;
      }
      const distSq = point.distanceSquared(viewPoint);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = object;
      }
    }

    return best;
  }

  /**
   * Named stars and planets currently projectable in the FOV, in a stable order
   * for keyboard N/P cycling (west→east, then low→high). Stars fade out of the
   * selectable set when the Sun washes them out.
   */
  public listSelectableObjectsInView(): SelectedSkyObject[] {
    // Called from interaction outside the redraw cycle; refresh the projection.
    this.projection = this.buildProjection();
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const magLimit = this.model.magnitudeLimitProperty.value;
    const starVisibility = effectiveStarVisibility(
      this.model.solarAltitudeDegProperty.value,
      this.model.showAtmosphereProperty.value,
    );

    type Ranked = { object: SelectedSkyObject; x: number; y: number };
    const ranked: Ranked[] = [];

    const pushIfVisible = (object: SelectedSkyObject, altDeg: number, azDeg: number): void => {
      if (hideBelowHorizon && altDeg < 0) {
        return;
      }
      const point = this.projectAltAz(altDeg, azDeg);
      if (!point) {
        return;
      }
      ranked.push({ object, x: point.x, y: point.y });
    };

    if (starVisibility >= STAR_SELECTABLE_MIN_VISIBILITY) {
      for (const star of NAMED_BRIGHT_STARS) {
        if (star.mag > magLimit) {
          continue;
        }
        const { altDeg, azDeg } = equatorialToHorizontal(star.raHours, star.decDeg, lat, lst);
        pushIfVisible(
          {
            kind: "star",
            id: star.id,
            raHours: star.raHours,
            decDeg: star.decDeg,
            mag: star.mag,
          },
          altDeg,
          azDeg,
        );
      }
    }

    if (this.model.showPlanetsProperty.value) {
      for (const entry of this.model.skySnapshotProperty.value.bodies) {
        const { altDeg, azDeg } = equatorialToHorizontal(entry.state.raHours, entry.state.decDeg, lat, lst);
        pushIfVisible({ kind: "planet", id: entry.bodyId }, altDeg, azDeg);
      }
    }

    ranked.sort((a, b) => a.x - b.x || b.y - a.y);
    return ranked.map((entry) => entry.object);
  }

  private projectSelectedObject(selected: SelectedSkyObject): Vector2 | null {
    const eq = this.model.equatorialOfSelected(selected);
    if (!eq) {
      return null;
    }
    const { altDeg, azDeg } = equatorialToHorizontal(
      eq.raHours,
      eq.decDeg,
      this.model.latitudeProperty.value,
      this.model.localSiderealTimeHoursProperty.value,
    );
    return this.projectAltAz(altDeg, azDeg);
  }

  /** Builds a projection value object from the current look / FOV / bounds. */
  private buildProjection(): SkyProjection {
    return new SkyProjection({
      bounds: this.bounds2,
      lookAzimuthDeg: this.model.lookAzimuthDegProperty.value,
      lookAltitudeDeg: this.model.lookAltitudeDegProperty.value,
      fieldOfViewDeg: this.model.fieldOfViewDegProperty.value,
    });
  }

  private azOffset(azDeg: number): number {
    return this.projection.azOffset(azDeg);
  }

  private azToX(azDeg: number): number {
    return this.projection.azToX(azDeg);
  }

  private altToY(altDeg: number): number {
    return this.projection.altToY(altDeg);
  }

  private projectAltAz(altDeg: number, azDeg: number): Vector2 | null {
    return this.projection.project(altDeg, azDeg);
  }

  private starRadius(mag: number): number {
    const t = clamp((mag - STAR_MAG_BRIGHT) / (this.model.magnitudeLimitProperty.value - STAR_MAG_BRIGHT), 0, 1);
    return STAR_RADIUS_MAX + (STAR_RADIUS_MIN - STAR_RADIUS_MAX) * t;
  }

  private altAzGridShape(): Shape {
    const b = this.bounds2;
    const shape = new Shape();
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const lookAz = this.model.lookAzimuthDegProperty.value;
    const fovX = this.model.fieldOfViewDegProperty.value;

    const yTop = b.minY;
    const yBottom = hideBelowHorizon ? Math.min(b.maxY, Math.max(b.minY, this.altToY(0))) : b.maxY;

    // Lines of constant altitude (horizontal parallels across the FOV).
    const altStart =
      Math.ceil(Math.max(this.projection.altMin, ALT_AZ_GRID_ALT_MIN_DEG) / ALT_AZ_GRID_ALT_STEP_DEG) *
      ALT_AZ_GRID_ALT_STEP_DEG;
    for (let alt = altStart; alt <= this.projection.altMax + 1e-9; alt += ALT_AZ_GRID_ALT_STEP_DEG) {
      if (alt > ALT_AZ_GRID_ALT_MAX_DEG) {
        break;
      }
      if (hideBelowHorizon && alt < 0) {
        continue;
      }
      if (alt < this.projection.altMin || alt > this.projection.altMax) {
        continue;
      }
      const y = this.altToY(alt);
      shape.moveTo(b.minX, y).lineTo(b.maxX, y);
    }

    // Lines of constant azimuth (vertical meridians across the FOV).
    if (yBottom > yTop + 1) {
      const azLo = lookAz - fovX / 2;
      const azHi = lookAz + fovX / 2;
      const azStart = Math.ceil(azLo / ALT_AZ_GRID_AZ_STEP_DEG) * ALT_AZ_GRID_AZ_STEP_DEG;
      for (let az = azStart; az <= azHi + 1e-9; az += ALT_AZ_GRID_AZ_STEP_DEG) {
        const x = this.azToX(az);
        if (x < b.minX || x > b.maxX) {
          continue;
        }
        shape.moveTo(x, yTop).lineTo(x, yBottom);
      }
    }

    return shape;
  }

  /**
   * Places altitude / azimuth tick labels on visible alt/az grid lines.
   * Alt labels sit along the left edge; az labels sit near the bottom of the sky.
   */
  private redrawHorizontalGridLabels(): void {
    const show = this.model.showGridProperty.value;
    if (!show) {
      for (const { label } of this.horizontalTickLabels) {
        label.visible = false;
      }
      return;
    }

    const b = this.bounds2;
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const fovX = this.model.fieldOfViewDegProperty.value;
    const skyBottomY = hideBelowHorizon ? Math.min(b.maxY, Math.max(b.minY, this.altToY(0))) : b.maxY;

    for (const tick of this.horizontalTickLabels) {
      if (tick.kind === "alt") {
        this.placeAltitudeGridLabel(tick, b, skyBottomY, hideBelowHorizon);
      } else {
        this.placeAzimuthGridLabel(tick, b, skyBottomY, fovX);
      }
    }
  }

  private placeAltitudeGridLabel(
    tick: HorizontalTickLabelNode,
    b: Bounds2,
    skyBottomY: number,
    hideBelowHorizon: boolean,
  ): void {
    const alt = tick.value;
    if ((hideBelowHorizon && alt < 0) || alt < this.projection.altMin || alt > this.projection.altMax) {
      tick.label.visible = false;
      return;
    }
    const y = this.altToY(alt);
    if (y < b.minY + GRID_LABEL_EDGE_INSET_PX || y > skyBottomY - GRID_LABEL_EDGE_INSET_PX) {
      tick.label.visible = false;
      return;
    }
    tick.label.left = b.minX + ALT_LABEL_LEFT_INSET_PX;
    tick.label.centerY = y;
    tick.label.visible = true;
  }

  private placeAzimuthGridLabel(tick: HorizontalTickLabelNode, b: Bounds2, skyBottomY: number, fovX: number): void {
    const az = tick.value;
    if (Math.abs(this.azOffset(az)) > fovX / 2) {
      tick.label.visible = false;
      return;
    }
    const x = this.azToX(az);
    if (x < b.minX + GRID_LABEL_EDGE_INSET_PX || x > b.maxX - GRID_LABEL_EDGE_INSET_PX) {
      tick.label.visible = false;
      return;
    }
    const labelY = skyBottomY - AZ_LABEL_BOTTOM_INSET_PX;
    if (labelY < b.minY + GRID_LABEL_EDGE_INSET_PX) {
      tick.label.visible = false;
      return;
    }
    tick.label.centerX = x;
    tick.label.bottom = labelY;
    tick.label.visible = true;
  }

  private meridianShape(): Shape {
    const shape = new Shape();
    // Local meridian: north (0°) and south (180°) altitude arcs.
    for (const az of [0, 180]) {
      let started = false;
      for (let alt = -10; alt <= 90; alt += MERIDIAN_ALT_STEP_DEG) {
        const point = this.projectAltAz(alt, az);
        if (!point) {
          started = false;
          continue;
        }
        if (!started) {
          shape.moveTo(point.x, point.y);
          started = true;
        } else {
          shape.lineTo(point.x, point.y);
        }
      }
    }
    return shape;
  }

  private equatorialGridShape(): Shape {
    const shape = new Shape();
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    const appendPolyline = (points: Vector2[]): void => {
      const first = points[0];
      if (!first || points.length < 2) {
        return;
      }
      shape.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const point = points[i];
        if (point) {
          shape.lineTo(point.x, point.y);
        }
      }
    };

    // Lines of constant RA (hour circles).
    for (let ra = 0; ra < 24; ra += EQUATORIAL_GRID_RA_STEP_HOURS) {
      const points: Vector2[] = [];
      for (
        let dec = EQUATORIAL_GRID_DEC_MIN_DEG;
        dec <= EQUATORIAL_GRID_DEC_MAX_DEG;
        dec += EQUATORIAL_SAMPLE_STEP_DEG
      ) {
        const { altDeg, azDeg } = equatorialToHorizontal(ra, dec, lat, lst);
        if (hideBelowHorizon && altDeg < 0) {
          appendPolyline(points);
          points.length = 0;
          continue;
        }
        const point = this.projectAltAz(altDeg, azDeg);
        if (!point) {
          appendPolyline(points);
          points.length = 0;
          continue;
        }
        points.push(point);
      }
      appendPolyline(points);
    }

    // Lines of constant Dec (parallels).
    for (
      let dec = EQUATORIAL_GRID_PARALLEL_DEC_MIN_DEG;
      dec <= EQUATORIAL_GRID_PARALLEL_DEC_MAX_DEG;
      dec += EQUATORIAL_GRID_DEC_STEP_DEG
    ) {
      const points: Vector2[] = [];
      for (let raStep = 0; raStep <= 360; raStep += EQUATORIAL_SAMPLE_STEP_DEG) {
        const ra = (raStep / 360) * 24;
        const { altDeg, azDeg } = equatorialToHorizontal(ra, dec, lat, lst);
        if (hideBelowHorizon && altDeg < 0) {
          appendPolyline(points);
          points.length = 0;
          continue;
        }
        const point = this.projectAltAz(altDeg, azDeg);
        if (!point) {
          appendPolyline(points);
          points.length = 0;
          continue;
        }
        points.push(point);
      }
      appendPolyline(points);
    }

    return shape;
  }

  /**
   * Places RA/Dec tick labels on visible grid lines. RA labels prefer the celestial
   * equator when it is in view; Dec labels prefer the sample nearest the FOV center.
   */
  private redrawEquatorialGridLabels(): void {
    const show = this.model.showEquatorialGridProperty.value;
    if (!show) {
      for (const { label } of this.equatorialTickLabels) {
        label.visible = false;
      }
      return;
    }

    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;
    const center = this.bounds2.center;

    for (const tick of this.equatorialTickLabels) {
      const point =
        tick.kind === "ra"
          ? this.bestEquatorialLabelPointForRa(tick.value, lat, lst, hideBelowHorizon, center)
          : this.bestEquatorialLabelPointForDec(tick.value, lat, lst, hideBelowHorizon, center);
      if (!point) {
        tick.label.visible = false;
        continue;
      }
      tick.label.center = point;
      tick.label.visible = true;
    }
  }

  private projectEquatorialLabelSample(
    raHours: number,
    decDeg: number,
    lat: number,
    lst: number,
    hideBelowHorizon: boolean,
  ): Vector2 | null {
    const { altDeg, azDeg } = equatorialToHorizontal(raHours, decDeg, lat, lst);
    if (hideBelowHorizon && altDeg < 0) {
      return null;
    }
    const point = this.projectAltAz(altDeg, azDeg);
    if (!(point && this.isEquatorialLabelPointInBounds(point))) {
      return null;
    }
    return point;
  }

  private isEquatorialLabelPointInBounds(point: Vector2): boolean {
    const b = this.bounds2;
    const inset = GRID_LABEL_EDGE_INSET_PX;
    return (
      point.x >= b.minX + inset && point.x <= b.maxX - inset && point.y >= b.minY + inset && point.y <= b.maxY - inset
    );
  }

  private bestEquatorialLabelPointForRa(
    raHours: number,
    lat: number,
    lst: number,
    hideBelowHorizon: boolean,
    center: Vector2,
  ): Vector2 | null {
    let best: Vector2 | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let dec = EQUATORIAL_GRID_DEC_MIN_DEG; dec <= EQUATORIAL_GRID_DEC_MAX_DEG; dec += EQUATORIAL_SAMPLE_STEP_DEG) {
      const point = this.projectEquatorialLabelSample(raHours, dec, lat, lst, hideBelowHorizon);
      if (!point) {
        continue;
      }
      // Prefer samples near Dec = 0 so hour labels sit on the celestial equator when visible.
      const equatorPenalty = Math.abs(dec) / EQUATORIAL_RA_LABEL_DEC_PREF_DEG;
      const score = point.distanceSquared(center) + equatorPenalty * equatorPenalty * 400;
      if (score < bestScore) {
        bestScore = score;
        best = point;
      }
    }
    return best;
  }

  private bestEquatorialLabelPointForDec(
    decDeg: number,
    lat: number,
    lst: number,
    hideBelowHorizon: boolean,
    center: Vector2,
  ): Vector2 | null {
    let best: Vector2 | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let raStep = 0; raStep < 360; raStep += EQUATORIAL_SAMPLE_STEP_DEG) {
      const ra = (raStep / 360) * 24;
      const point = this.projectEquatorialLabelSample(ra, decDeg, lat, lst, hideBelowHorizon);
      if (!point) {
        continue;
      }
      const score = point.distanceSquared(center);
      if (score < bestScore) {
        bestScore = score;
        best = point;
      }
    }
    return best;
  }

  private constellationShape(): Shape {
    const shape = new Shape();
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    for (const figure of CONSTELLATION_FIGURES) {
      for (const segment of figure.segments) {
        const from = constellationStarById(segment.fromId);
        const to = constellationStarById(segment.toId);
        if (!(from && to)) {
          continue;
        }
        const fromH = equatorialToHorizontal(from.raHours, from.decDeg, lat, lst);
        const toH = equatorialToHorizontal(to.raHours, to.decDeg, lat, lst);
        if (hideBelowHorizon && (fromH.altDeg < 0 || toH.altDeg < 0)) {
          continue;
        }
        const p0 = this.projectAltAz(fromH.altDeg, fromH.azDeg);
        const p1 = this.projectAltAz(toH.altDeg, toH.azDeg);
        if (!(p0 && p1)) {
          continue;
        }
        shape.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y);
      }
    }
    return shape;
  }

  private drawStarInto(
    shape: Shape,
    raHours: number,
    decDeg: number,
    mag: number,
    lat: number,
    lst: number,
    hideBelowHorizon: boolean,
  ): void {
    const { altDeg, azDeg } = equatorialToHorizontal(raHours, decDeg, lat, lst);
    if (hideBelowHorizon && altDeg < 0) {
      return;
    }
    const point = this.projectAltAz(altDeg, azDeg);
    if (!point) {
      return;
    }
    const r = this.starRadius(mag);
    shape.moveTo(point.x + r, point.y);
    shape.arc(point.x, point.y, r, 0, Math.PI * 2);
  }

  private redrawStars(): Shape {
    const shape = new Shape();
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const magLimit = this.model.magnitudeLimitProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    if (this.model.deepStarCatalogProperty.value) {
      const { data, count } = getDeepStarData();
      for (let i = 0; i < count; i++) {
        const mag = data[i * 3 + 2];
        // Catalog is sorted ascending by magnitude, so stop early past the limit.
        if (mag === undefined || mag > magLimit) {
          break;
        }
        const ra = data[i * 3];
        const dec = data[i * 3 + 1];
        if (ra === undefined || dec === undefined) {
          break;
        }
        this.drawStarInto(shape, ra, dec, mag, lat, lst, hideBelowHorizon);
      }
    } else {
      for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
        const mag = BRIGHT_STAR_MAG[i];
        if (mag === undefined || mag > magLimit) {
          continue;
        }
        const ra = BRIGHT_STAR_RA_HOURS[i];
        const dec = BRIGHT_STAR_DEC_DEG[i];
        if (ra === undefined || dec === undefined) {
          continue;
        }
        this.drawStarInto(shape, ra, dec, mag, lat, lst, hideBelowHorizon);
      }
    }
    return shape;
  }

  private redrawStarLabels(): void {
    const show = this.model.showStarLabelsProperty.value;
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const magLimit = this.model.magnitudeLimitProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    for (const { starId, label } of this.starLabelNodes) {
      const star = namedStarById(starId);
      if (!(show && star) || star.mag > magLimit) {
        label.visible = false;
        continue;
      }
      const { altDeg, azDeg } = equatorialToHorizontal(star.raHours, star.decDeg, lat, lst);
      if (hideBelowHorizon && altDeg < 0) {
        label.visible = false;
        continue;
      }
      const point = this.projectAltAz(altDeg, azDeg);
      if (!point) {
        label.visible = false;
        continue;
      }
      const r = this.starRadius(star.mag);
      label.left = point.x + r + LABEL_OFFSET_X;
      label.centerY = point.y + LABEL_OFFSET_Y;
      label.visible = true;
    }
  }

  private redrawCardinals(): void {
    const show = this.model.showCardinalsProperty.value;
    const labels = this.cardinalLabels;
    const mainCardinals: { node: Text; azDeg: number }[] = [
      { node: labels.north, azDeg: 0 },
      { node: labels.east, azDeg: 90 },
      { node: labels.south, azDeg: 180 },
      { node: labels.west, azDeg: 270 },
    ];
    const intercardinals: { node: Text; azDeg: number }[] = [
      { node: labels.northeast, azDeg: 45 },
      { node: labels.southeast, azDeg: 135 },
      { node: labels.southwest, azDeg: 225 },
      { node: labels.northwest, azDeg: 315 },
    ];

    const placeInFov = (node: Text, altDeg: number, azDeg: number): boolean => {
      if (!show) {
        node.visible = false;
        return false;
      }
      const point = this.projectAltAz(altDeg, azDeg);
      if (!point) {
        node.visible = false;
        return false;
      }
      node.center = point;
      node.visible = true;
      return true;
    };

    for (const { node, azDeg } of [...mainCardinals, ...intercardinals]) {
      placeInFov(node, CARDINAL_LABEL_ALTITUDE_DEG, azDeg);
    }
    placeInFov(labels.zenith, ZENITH_MARKER_ALTITUDE_DEG, this.model.lookAzimuthDegProperty.value);

    if (!show) {
      return;
    }

    // Pin any primary cardinal still outside the FOV to the view edge that
    // points toward it (left / right / behind), so N/E/S/W stay readable even
    // when the default south-facing FOV only contains South on the sky.
    // Left/right pins sit on the ground below the horizon so they do not
    // collide with in-FOV intercardinals (SE/SW) at the FOV edges.
    const lookAz = this.model.lookAzimuthDegProperty.value;
    const b = this.bounds2;
    const inset = CARDINAL_EDGE_INSET_PX;
    const horizonY = clamp(this.altToY(0), b.minY, b.maxY);
    const groundLabelY = Math.min(b.maxY - inset, horizonY + 16);

    const mainByQuarter = [labels.north, labels.east, labels.south, labels.west] as const;
    const nearestMain = (azDeg: number): Text => {
      const wrapped = normalizeDegrees(azDeg);
      const index = ((Math.round(wrapped / 90) % 4) + 4) % 4;
      return mainByQuarter[index as 0 | 1 | 2 | 3];
    };

    const pinEdge = (node: Text, edge: "left" | "right" | "behind"): void => {
      if (node.visible) {
        return;
      }
      if (edge === "left") {
        node.left = b.minX + inset;
        node.centerY = groundLabelY;
      } else if (edge === "right") {
        node.right = b.maxX - inset;
        node.centerY = groundLabelY;
      } else {
        node.centerX = b.centerX;
        node.top = b.minY + inset;
      }
      node.visible = true;
    };

    pinEdge(nearestMain(lookAz - 90), "left");
    pinEdge(nearestMain(lookAz + 90), "right");
    pinEdge(nearestMain(lookAz + 180), "behind");
  }

  private redrawSelection(): void {
    const selected = this.model.selectedObjectProperty.value;
    if (!selected) {
      this.selectionRing.visible = false;
      return;
    }

    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    const eq = this.model.equatorialOfSelected(selected);
    if (!eq) {
      this.selectionRing.visible = false;
      return;
    }
    const { altDeg, azDeg } = equatorialToHorizontal(eq.raHours, eq.decDeg, lat, lst);

    let radius: number;
    if (selected.kind === "star") {
      radius = this.starRadius(selected.mag) + SELECTION_RING_PADDING_PX;
    } else {
      const state = this.model.skySnapshotProperty.value.byId.get(selected.id);
      const visual = solarSystemBodyVisual(selected.id);
      radius = state
        ? this.planetsNode.discRadiusPx(visual, state.mag, state.distAu, this.projection) + SELECTION_RING_PADDING_PX
        : STAR_RADIUS_MAX + SELECTION_RING_PADDING_PX;
    }

    if (hideBelowHorizon && altDeg < 0) {
      this.selectionRing.visible = false;
      return;
    }

    const point = this.projectAltAz(altDeg, azDeg);
    if (!point) {
      this.selectionRing.visible = false;
      return;
    }

    this.selectionRing.radius = radius;
    this.selectionRing.center = point;
    this.selectionRing.visible = true;
  }

  private redrawConstellationLabels(): void {
    const show = this.model.showConstellationsProperty.value;
    const starVisibility = effectiveStarVisibility(
      this.model.solarAltitudeDegProperty.value,
      this.model.showAtmosphereProperty.value,
    );
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.localSiderealTimeHoursProperty.value;
    const hideBelowHorizon = this.model.showHorizonProperty.value;

    for (const { id, label } of this.constellationLabelNodes) {
      if (!(show && starVisibility > CONSTELLATION_LABEL_MIN_VISIBILITY)) {
        label.visible = false;
        continue;
      }
      const figure = CONSTELLATION_FIGURES.find((f) => f.id === id);
      if (!figure) {
        label.visible = false;
        continue;
      }

      const starIds = new Set<string>();
      for (const segment of figure.segments) {
        starIds.add(segment.fromId);
        starIds.add(segment.toId);
      }

      let sumX = 0;
      let sumY = 0;
      let count = 0;
      for (const starId of starIds) {
        const star = constellationStarById(starId);
        if (!star) {
          continue;
        }
        const { altDeg, azDeg } = equatorialToHorizontal(star.raHours, star.decDeg, lat, lst);
        if (hideBelowHorizon && altDeg < 0) {
          continue;
        }
        const point = this.projectAltAz(altDeg, azDeg);
        if (!point) {
          continue;
        }
        sumX += point.x;
        sumY += point.y;
        count++;
      }

      if (count < 2) {
        label.visible = false;
        continue;
      }

      label.centerX = sumX / count;
      label.centerY = sumY / count;
      label.opacity = 0.55 + 0.35 * starVisibility;
      label.visible = true;
    }
  }

  private redrawTwilightSky(): void {
    const b = this.bounds2;
    const solarAlt = this.model.showAtmosphereProperty.value
      ? this.model.solarAltitudeDegProperty.value
      : ASTRONOMICAL_TWILIGHT_DEG - 1;
    const colors = twilightSkyColors(solarAlt, {
      nightZenith: ZenithColors.skyPanelColorProperty.value,
      nightHorizon: ZenithColors.skyNightHorizonColorProperty.value,
      nightGround: ZenithColors.groundColorProperty.value,
      dayZenith: ZenithColors.skyDayZenithColorProperty.value,
      dayHorizon: ZenithColors.skyDayHorizonColorProperty.value,
      dayGround: ZenithColors.groundDayColorProperty.value,
      twilightHorizon: ZenithColors.skyTwilightHorizonColorProperty.value,
    });

    const showHorizon = this.model.showHorizonProperty.value;
    const horizonY = showHorizon ? clamp(this.altToY(0), b.minY, b.maxY) : b.maxY;
    const skyBottom = Math.max(b.minY + 1, horizonY);

    const gradient = new LinearGradient(b.centerX, b.minY, b.centerX, skyBottom);
    gradient.addColorStop(0, colors.zenith);
    gradient.addColorStop(1, colors.horizon);
    this.skyFill.fill = gradient;
    this.skyFill.setRect(b.minX, b.minY, b.width, b.height);

    if (showHorizon) {
      this.groundFill.fill = colors.ground;
      this.groundFill.shape = Shape.rect(b.minX, horizonY, b.width, Math.max(0, b.maxY - horizonY));
      this.horizonLine.shape = Shape.lineSegment(b.minX, horizonY, b.maxX, horizonY);
      this.groundFill.visible = true;
      this.horizonLine.visible = true;
    } else {
      this.groundFill.visible = false;
      this.horizonLine.visible = false;
    }
  }

  private redraw(): void {
    this.projection = this.buildProjection();
    this.redrawTwilightSky();

    const starVisibility = effectiveStarVisibility(
      this.model.solarAltitudeDegProperty.value,
      this.model.showAtmosphereProperty.value,
    );
    this.starsPath.opacity = starVisibility;
    this.starLabelsLayer.opacity = starVisibility;
    this.constellationPath.opacity = 0.85 * starVisibility;
    this.constellationLabelsLayer.opacity = starVisibility;

    this.equatorialGridPath.visible = this.model.showEquatorialGridProperty.value;
    if (this.equatorialGridPath.visible) {
      this.equatorialGridPath.shape = this.equatorialGridShape();
    }
    this.redrawEquatorialGridLabels();

    this.constellationPath.visible =
      this.model.showConstellationsProperty.value && starVisibility > STAR_RENDER_MIN_VISIBILITY;
    if (this.constellationPath.visible) {
      this.constellationPath.shape = this.constellationShape();
    }

    this.gridPath.visible = this.model.showGridProperty.value;
    if (this.gridPath.visible) {
      this.gridPath.shape = this.altAzGridShape();
    }
    this.redrawHorizontalGridLabels();

    this.meridianPath.visible = this.model.showMeridianProperty.value;
    if (this.meridianPath.visible) {
      this.meridianPath.shape = this.meridianShape();
    }

    this.starsPath.shape = starVisibility > STAR_RENDER_MIN_VISIBILITY ? this.redrawStars() : null;
    this.planetsNode.redraw(this.projection);
    this.redrawStarLabels();
    this.redrawConstellationLabels();
    this.redrawCardinals();
    this.redrawSelection();
  }
}
