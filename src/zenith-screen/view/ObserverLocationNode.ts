/**
 * ObserverLocationNode.ts
 *
 * A small realistic (equirectangular) map of the Earth with a draggable observer
 * pin. Dragging the pin — or focusing the map and using the arrow keys — sets the
 * observer's latitude / longitude, the visual companion to the Latitude / Longitude
 * NumberControls.
 *
 * Adapted from the OpenPhysics RotatingSky sim's Explorer "Observer Location" map
 * (`FlatEarthMapNode`). Land coastlines come from Natural Earth data in
 * {@link EARTH_SHORE_POLYGONS}; longitude maps to x (−180° left, +180° right) and
 * latitude to y (+90° top, −90° bottom). Shore polygons are split at the
 * antimeridian, and the Antarctic cap is routed along the bottom edge, so filled
 * land never smears across the map.
 */

import { Multilink, type NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import {
  Circle,
  DragListener,
  KeyboardListener,
  Line,
  Node,
  type NodeOptions,
  Path,
  Rectangle,
} from "scenerystack/scenery";
import ZenithColors from "../../ZenithColors.js";
import { LATITUDE_RANGE, LOCATION_STEP_DEGREES, LONGITUDE_RANGE } from "../../ZenithConstants.js";
import { EARTH_SHORE_POLYGONS, type EarthShorePoint } from "./EarthShoreData.js";

export type ObserverLocationNodeOptions = NodeOptions & {
  /** Width of the map in view pixels (height is half, for a 2:1 equirectangular aspect). */
  mapWidth?: number;
  /** Accessible name announced for the draggable map. */
  accessibleName?: TReadOnlyProperty<string> | string;
  /** Accessible help text for the draggable map. */
  accessibleHelpText?: TReadOnlyProperty<string> | string;
};

type GeoPoint = { lon: number; lat: number };

const RAD_TO_DEG = 180 / Math.PI;

const shorePointToGeo = (point: EarthShorePoint): GeoPoint => ({
  lon: Math.atan2(point.y, point.x) * RAD_TO_DEG,
  lat: Math.asin(point.z) * RAD_TO_DEG,
});

/** True when the short map edge between two lon/lats crosses the antimeridian. */
const crossesDateline = (from: GeoPoint, to: GeoPoint): boolean => Math.abs(to.lon - from.lon) > 180;

/** Degrees traveled eastward from `from` to `to` (mod 360). */
const eastwardArc = (from: GeoPoint, to: GeoPoint): number => (to.lon - from.lon + 360) % 360;

/** Standard shore polygons: split at the dateline so each subpath closes locally. */
const addSplitShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
): void => {
  let previousLon: number | null = null;
  let penDown = false;

  for (const point of polygon) {
    const { lon, lat } = shorePointToGeo(point);
    if (previousLon !== null && Math.abs(lon - previousLon) > 180) {
      if (penDown) {
        shape.close();
      }
      penDown = false;
    }
    if (penDown) {
      shape.lineTo(lonToX(lon), latToY(lat));
    } else {
      shape.moveTo(lonToX(lon), latToY(lat));
      penDown = true;
    }
    previousLon = lon;
  }

  if (penDown) {
    shape.close();
  }
};

/**
 * Southern-cap shore polygons (Antarctica): keep one continuous path, route dateline
 * crossings through the south-pole map edge, and close along the bottom.
 */
const addSouthCapShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): void => {
  const points = polygon.map(shorePointToGeo);
  const first = points[0] as GeoPoint;

  const appendSouthCapEdge = (from: GeoPoint, to: GeoPoint): void => {
    if (crossesDateline(from, to)) {
      const westward = eastwardArc(from, to) > 180;
      const exitEdgeX = westward ? 0 : width;
      shape.lineTo(exitEdgeX, latToY(from.lat));
      shape.lineTo(exitEdgeX, height);
      // Stop at the target longitude — not the far map edge — so the closing
      // edge does not retrace this bottom segment and leave a fill notch.
      shape.lineTo(lonToX(to.lon), height);
    }
    shape.lineTo(lonToX(to.lon), latToY(to.lat));
  };

  shape.moveTo(lonToX(first.lon), latToY(first.lat));
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (from && to) {
      appendSouthCapEdge(from, to);
    }
  }
  shape.close();
};

/** Add one land shore polygon to the flat map shape. */
const addShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): void => {
  if (polygon.length === 0) {
    return;
  }
  const minLat = Math.min(...polygon.map((point) => shorePointToGeo(point).lat));
  if (minLat < -60) {
    addSouthCapShorePolygonToShape(shape, polygon, lonToX, latToY, width, height);
  } else {
    addSplitShorePolygonToShape(shape, polygon, lonToX, latToY);
  }
};

const buildLandShape = (
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): Shape => {
  const land = new Shape();
  for (const polygon of EARTH_SHORE_POLYGONS) {
    addShorePolygonToShape(land, polygon, lonToX, latToY, width, height);
  }
  return land;
};

export class ObserverLocationNode extends Node {
  public constructor(
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
    providedOptions?: ObserverLocationNodeOptions,
  ) {
    const { mapWidth = 220, ...nodeOptions } = providedOptions ?? {};
    const width = mapWidth;
    const height = mapWidth / 2;

    const lonToX = (lon: number): number => ((lon + 180) / 360) * width;
    const latToY = (lat: number): number => ((90 - lat) / 180) * height;
    const modelViewTransform = ModelViewTransform2.createRectangleInvertedYMapping(
      new Bounds2(-180, -90, 180, 90),
      new Bounds2(0, 0, width, height),
    );
    const modelPositionProperty = new Property(new Vector2(longitudeProperty.value, latitudeProperty.value));

    // Ocean + realistic land coastlines.
    const mapRect = new Rectangle(0, 0, width, height, {
      fill: ZenithColors.earthOceanColorProperty,
      stroke: ZenithColors.panelBorderColorProperty,
      lineWidth: 1,
    });
    const landPath = new Path(buildLandShape(lonToX, latToY, width, height), {
      fill: ZenithColors.earthLandColorProperty,
      stroke: ZenithColors.panelBorderColorProperty,
      lineWidth: 0.35,
      opacity: 0.95,
    });

    // Graticule: parallels every 30°, meridians every 60°, with a stronger equator.
    const grid = new Shape();
    for (let lat = -60; lat <= 60; lat += 30) {
      grid.moveTo(0, latToY(lat)).lineTo(width, latToY(lat));
    }
    for (let lon = -120; lon <= 120; lon += 60) {
      grid.moveTo(lonToX(lon), 0).lineTo(lonToX(lon), height);
    }
    const gridPath = new Path(grid, {
      stroke: ZenithColors.earthGraticuleColorProperty,
      lineWidth: 0.5,
      opacity: 0.7,
    });
    const equatorLine = new Line(0, latToY(0), width, latToY(0), {
      stroke: ZenithColors.accentColorProperty,
      lineWidth: 1,
    });

    // Observer pin: crosshair + dot. The transparent disk enlarges the grab
    // target (the crosshair arms are thin) and carries the DragListener, so only
    // the pin moves the observer — clicks elsewhere on the map do nothing.
    const pin = new Node({
      cursor: "grab",
      children: [
        new Circle(12, { fill: "rgba(0,0,0,0)" }),
        new Line(-9, 0, 9, 0, { stroke: ZenithColors.locationPinColorProperty, lineWidth: 1.5 }),
        new Line(0, -9, 0, 9, { stroke: ZenithColors.locationPinColorProperty, lineWidth: 1.5 }),
        new Circle(3.5, { fill: ZenithColors.locationPinColorProperty, stroke: "#ffffff", lineWidth: 0.75 }),
      ],
    });

    // Clip overlaid content to the map rect so crosshair arms near the edge
    // never inflate the panel.
    const overlay = new Node({
      children: [landPath, gridPath, equatorLine, pin],
      clipArea: Shape.rect(0, 0, width, height),
    });

    super({
      children: [mapRect, overlay],
      tagName: "div",
      focusable: true,
      ...nodeOptions,
    });

    // The DragListener clamps modelPositionProperty to the lat/long bounds itself.
    // `useParentOffset` derives the grab offset from the positionProperty (not the
    // node transform), so pressing the crosshair never shifts it.
    const dragListener = new DragListener({
      transform: modelViewTransform,
      positionProperty: modelPositionProperty,
      dragBoundsProperty: new Property(
        new Bounds2(LONGITUDE_RANGE.min, LATITUDE_RANGE.min, LONGITUDE_RANGE.max, LATITUDE_RANGE.max),
      ),
      useParentOffset: true,
    });
    pin.addInputListener(dragListener);

    // Keep the pin and the drag's positionProperty in sync with the observer's
    // lat/long (keyboard / slider / combo / reset). The positionProperty half is
    // skipped while dragging — the DragListener owns it then — otherwise the round
    // trip trips axon's reentry guard on tiny float drift.
    Multilink.multilink([latitudeProperty, longitudeProperty], (lat, lon) => {
      pin.translation = new Vector2(lonToX(lon), latToY(lat));
      if (!dragListener.isPressedProperty.value) {
        modelPositionProperty.value = new Vector2(lon, lat);
      }
    });

    // A drag writes the (bounds-clamped) position back into the observer's lat/long.
    modelPositionProperty.lazyLink((modelPt) => {
      longitudeProperty.value = modelPt.x;
      latitudeProperty.value = modelPt.y;
    });

    // Arrow keys nudge the location when the map is focused.
    this.addInputListener(
      new KeyboardListener({
        keys: ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          if (keysPressed === "arrowLeft") {
            longitudeProperty.value = LONGITUDE_RANGE.constrainValue(longitudeProperty.value - LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowRight") {
            longitudeProperty.value = LONGITUDE_RANGE.constrainValue(longitudeProperty.value + LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowUp") {
            latitudeProperty.value = LATITUDE_RANGE.constrainValue(latitudeProperty.value + LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowDown") {
            latitudeProperty.value = LATITUDE_RANGE.constrainValue(latitudeProperty.value - LOCATION_STEP_DEGREES);
          }
        },
      }),
    );
  }
}
