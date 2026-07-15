/**
 * attachPlanetariumInteraction.ts
 *
 * Pointer + keyboard camera control for the first-person sky view.
 *
 * Focus-based (fire only when the sky view has focus, since they mirror pointer
 * gestures and share arrow keys / Escape with other focusable controls):
 *   - plain drag / arrow keys       → pan look az/alt
 *   - Ctrl/Meta-drag / Ctrl+arrows  → advance civil time (LST follows)
 *   - click (small motion)          → select nearest named star / planet
 *   - Shift-click                   → angular-distance measure points
 *   - Escape                        → clear selection / measurement
 *   - wheel                         → change field of view
 *
 * Global command shortcuts (KeyboardListener.createGlobal — fire regardless of
 * focus, Stellarium-style):
 *   - N / P                         → cycle selectable objects in view
 *   - T                             → track selected object (camera follows)
 *   - + / −                         → zoom field of view
 *   - Shift+N/S/E/W/Z               → quick-look North/South/East/West/Zenith
 *   - J / K / L                     → slower / normal / faster time rate
 *   - Shift++ / Shift+−             → advance / rewind one sidereal day
 *   - A G Q Z E M                   → toggle atmosphere / horizon / cardinals /
 *                                     alt-az grid / equatorial grid / meridian
 */

import { PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { DragListener, HotkeyData, KeyboardListener, type Node } from "scenerystack/scenery";
import { AccessibleDraggableOptions } from "scenerystack/scenery-phet";
import { equatorialToHorizontal } from "../../common/sky/SkyCoordinates.js";
import ZenithHotkeyData from "../../common/ZenithHotkeyData.js";
import { StringManager } from "../../i18n/StringManager.js";
import {
  FOV_KEYBOARD_STEP_DEG,
  HOURS_PER_SIDEREAL_DAY,
  LOOK_EAST_AZIMUTH_DEG,
  LOOK_NORTH_AZIMUTH_DEG,
  LOOK_PAN_DEG_PER_PIXEL,
  LOOK_PAN_KEYBOARD_STEP_DEG,
  LOOK_SOUTH_AZIMUTH_DEG,
  LOOK_WEST_AZIMUTH_DEG,
  LOOK_ZENITH_ALTITUDE_DEG,
  TIME_DRAG_HOURS_PER_PIXEL,
  TIME_KEYBOARD_STEP_HOURS,
} from "../../SimConstants.js";
import type { SelectedSkyObject } from "../model/SelectedSkyObject.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import type { PlanetariumSkyNode } from "./PlanetariumSkyNode.js";
import { wrapLookAzimuth } from "./SkyProjection.js";

/** Max pointer travel (view px) still treated as a click rather than a pan. */
const CLICK_MOVE_THRESHOLD_PX = 6;

/** FOV change per discrete wheel notch (degrees). */
const FOV_WHEEL_STEP_DEG = 5;

export type AttachPlanetariumInteractionOptions = {
  model: ZenithModel;
  skyNode: PlanetariumSkyNode;
  accessibleNameProperty: TReadOnlyProperty<string>;
  accessibleHelpTextProperty?: TReadOnlyProperty<string>;
};

const formatHours = (hours: number): string => hours.toFixed(2);
const formatDeg = (deg: number): string => deg.toFixed(1);
const formatMag = (mag: number): string => mag.toFixed(2);

/** True when the DOM event reports the given modifier (mouse / pointer / keyboard / wheel). */
const domModifier = (domEvent: Event | null | undefined, key: "ctrlKey" | "metaKey" | "shiftKey"): boolean =>
  !!domEvent && key in domEvent && !!(domEvent as unknown as Record<string, boolean>)[key];

const announceSelection = (target: Node, model: ZenithModel, selected: SelectedSkyObject | null): void => {
  const a11y = StringManager.getInstance().getA11yStrings();
  if (!selected) {
    target.addAccessibleResponse(a11y.selectionClearedStringProperty);
    return;
  }

  const bodies = StringManager.getInstance().getBodies();
  const stars = StringManager.getInstance().getStars();

  const eq = model.equatorialOfSelected(selected);
  if (!eq) {
    return;
  }
  const name =
    selected.kind === "star"
      ? (stars[`${selected.id}StringProperty` as keyof typeof stars] as TReadOnlyProperty<string>).value
      : (bodies[`${selected.id}StringProperty` as keyof typeof bodies] as TReadOnlyProperty<string>).value;

  const lat = model.latitudeProperty.value;
  const lst = model.localSiderealTimeHoursProperty.value;
  const { altDeg, azDeg } = equatorialToHorizontal(eq.raHours, eq.decDeg, lat, lst);

  target.addAccessibleResponse(
    new PatternStringProperty(a11y.selectedAnnouncementStringProperty, {
      name,
      mag: formatMag(eq.mag),
      ra: formatHours(eq.raHours),
      dec: formatDeg(eq.decDeg),
      alt: formatDeg(altDeg),
      az: formatDeg(azDeg),
    }),
  );
};

/** Announces the current measure-tool state to assistive tech. */
const announceMeasurement = (target: Node, model: ZenithModel): void => {
  const a11y = StringManager.getInstance().getA11yStrings();
  const start = model.measureStartProperty.value;
  const end = model.measureEndProperty.value;
  const separation = model.measureSeparationDegProperty.value;
  if (start && end && separation !== null) {
    target.addAccessibleResponse(
      new PatternStringProperty(a11y.measureResultStringProperty, { deg: formatDeg(separation) }),
    );
  } else if (start) {
    target.addAccessibleResponse(a11y.measureFirstPointStringProperty);
  } else {
    target.addAccessibleResponse(a11y.measureClearedStringProperty);
  }
};

const sameSelection = (a: SelectedSkyObject | null, b: SelectedSkyObject): boolean => {
  if (!a || a.kind !== b.kind) {
    return false;
  }
  return a.id === b.id;
};

const cycleSelection = (model: ZenithModel, skyNode: PlanetariumSkyNode, direction: 1 | -1): void => {
  const objects = skyNode.listSelectableObjectsInView();
  if (objects.length === 0) {
    model.clearSelection();
    return;
  }
  const current = model.selectedObjectProperty.value;
  let index = objects.findIndex((obj) => sameSelection(current, obj));
  if (index < 0) {
    index = direction === 1 ? -1 : 0;
  }
  const nextIndex = (index + direction + objects.length) % objects.length;
  model.selectedObjectProperty.value = objects[nextIndex] ?? null;
};

/**
 * Makes `target` a focusable planetarium control with pointer drag and keyboard
 * equivalents. Returns `target` for chaining.
 */
export const attachPlanetariumInteraction = <T extends Node>(
  target: T,
  options: AttachPlanetariumInteractionOptions,
): T => {
  const { model, skyNode, accessibleNameProperty, accessibleHelpTextProperty } = options;

  // application role + aria-label name behavior for custom keyboard interactives
  target.mutate({
    ...AccessibleDraggableOptions,
    accessibleName: accessibleNameProperty,
    ...(accessibleHelpTextProperty ? { accessibleHelpText: accessibleHelpTextProperty } : {}),
  });

  const lastPoint = new Vector2(0, 0);
  const startPoint = new Vector2(0, 0);
  let dragMode: "pan" | "time" = "pan";
  let totalMove = 0;
  let measureClick = false;

  const panBy = (dAzDeg: number, dAltDeg: number): void => {
    model.lookAzimuthDegProperty.value = wrapLookAzimuth(model.lookAzimuthDegProperty.value + dAzDeg);
    model.setLookAltitude(model.lookAltitudeDegProperty.value + dAltDeg);
  };

  const setSelection = (selected: SelectedSkyObject | null): void => {
    model.selectedObjectProperty.value = selected;
    announceSelection(target, model, selected);
  };

  target.addInputListener(
    new DragListener({
      start: (event) => {
        lastPoint.set(event.pointer.point);
        startPoint.set(event.pointer.point);
        totalMove = 0;
        measureClick = domModifier(event.domEvent, "shiftKey");
        dragMode = domModifier(event.domEvent, "ctrlKey") || domModifier(event.domEvent, "metaKey") ? "time" : "pan";
      },
      drag: (event) => {
        const p = event.pointer.point;
        const dx = p.x - lastPoint.x;
        const dy = p.y - lastPoint.y;
        totalMove = p.distance(startPoint);
        if (dragMode === "time") {
          model.advanceSiderealTime(-dx * TIME_DRAG_HOURS_PER_PIXEL);
        } else {
          // Grab-and-drag the sky: content follows the pointer. Dragging right
          // moves the sky right, revealing lower azimuth at the center;
          // dragging down moves it down, revealing higher altitude.
          panBy(-dx * LOOK_PAN_DEG_PER_PIXEL, dy * LOOK_PAN_DEG_PER_PIXEL);
        }
        lastPoint.set(p);
      },
      end: (event) => {
        if (!event || dragMode !== "pan" || totalMove > CLICK_MOVE_THRESHOLD_PX) {
          return;
        }
        const viewPoint = skyNode.globalToLocalPoint(event.pointer.point);
        if (measureClick) {
          model.addMeasurePoint(skyNode.equatorialAtViewPoint(viewPoint));
          announceMeasurement(target, model);
          return;
        }
        setSelection(skyNode.findNearestObject(viewPoint));
      },
    }),
  );

  // Look pan + time scrub — hold-repeat, matching continuous drag.
  target.addInputListener(
    new KeyboardListener({
      keyStringProperties: HotkeyData.combineKeyStringProperties([
        ZenithHotkeyData.LOOK_PAN,
        ZenithHotkeyData.ADVANCE_CIVIL_TIME_LISTENER,
      ]),
      fireOnHold: true,
      fire: (_event, keysPressed) => {
        if (ZenithHotkeyData.ADVANCE_CIVIL_TIME_LISTENER.hasKeyStroke(keysPressed)) {
          const sign = keysPressed.includes("arrowLeft") ? 1 : -1;
          model.advanceSiderealTime(sign * TIME_KEYBOARD_STEP_HOURS);
          return;
        }
        if (keysPressed === "arrowLeft") {
          panBy(-LOOK_PAN_KEYBOARD_STEP_DEG, 0);
        } else if (keysPressed === "arrowRight") {
          panBy(LOOK_PAN_KEYBOARD_STEP_DEG, 0);
        } else if (keysPressed === "arrowUp") {
          panBy(0, LOOK_PAN_KEYBOARD_STEP_DEG);
        } else if (keysPressed === "arrowDown") {
          panBy(0, -LOOK_PAN_KEYBOARD_STEP_DEG);
        }
      },
    }),
  );

  // Escape clears measurement / selection — single fire (no hold-repeat).
  target.addInputListener(
    new KeyboardListener({
      keyStringProperties: ZenithHotkeyData.CLEAR_SELECTION.keyStringProperties,
      fireOnHold: false,
      fire: () => {
        if (model.measureStartProperty.value || model.measureEndProperty.value) {
          model.clearMeasurement();
          announceMeasurement(target, model);
        }
        setSelection(null);
      },
    }),
  );

  // ── Global command shortcuts ────────────────────────────────────────────────
  // Everything below is registered with KeyboardListener.createGlobal so it fires
  // regardless of where focus is (Stellarium-style), unlike the pan / time-scrub /
  // Escape listeners above, which stay tied to the focused sky view so they don't
  // hijack arrow-key slider navigation or Escape used to dismiss dialogs.

  // Discrete object cycling — no hold-repeat (unlike pan).
  KeyboardListener.createGlobal(target, {
    keyStringProperties: HotkeyData.combineKeyStringProperties([
      ZenithHotkeyData.SELECT_NEXT,
      ZenithHotkeyData.SELECT_PREVIOUS,
    ]),
    fireOnHold: false,
    fire: (_event, keysPressed) => {
      if (ZenithHotkeyData.SELECT_NEXT.hasKeyStroke(keysPressed)) {
        cycleSelection(model, skyNode, 1);
      } else if (ZenithHotkeyData.SELECT_PREVIOUS.hasKeyStroke(keysPressed)) {
        cycleSelection(model, skyNode, -1);
      }
      announceSelection(target, model, model.selectedObjectProperty.value);
    },
  });

  // Track toggle — keep the camera centered on the selected object as time passes.
  KeyboardListener.createGlobal(target, {
    keyStringProperties: ZenithHotkeyData.TRACK_OBJECT.keyStringProperties,
    fireOnHold: false,
    fire: () => {
      const a11y = StringManager.getInstance().getA11yStrings();
      if (!model.selectedObjectProperty.value) {
        target.addAccessibleResponse(a11y.trackingNoSelectionStringProperty);
        return;
      }
      const tracking = !model.trackSelectedObjectProperty.value;
      model.trackSelectedObjectProperty.value = tracking;
      target.addAccessibleResponse(tracking ? a11y.trackingOnStringProperty : a11y.trackingOffStringProperty);
    },
  });

  // Zoom in / out — hold-repeatable, matching continuous wheel zoom.
  KeyboardListener.createGlobal(target, {
    keyStringProperties: HotkeyData.combineKeyStringProperties([ZenithHotkeyData.ZOOM_IN, ZenithHotkeyData.ZOOM_OUT]),
    fireOnHold: true,
    fire: (_event, keysPressed) => {
      // Zoom IN narrows the FOV (negative delta); zoom OUT widens it.
      const sign = ZenithHotkeyData.ZOOM_IN.hasKeyStroke(keysPressed) ? -1 : 1;
      model.zoomBy(sign * FOV_KEYBOARD_STEP_DEG);
    },
  });

  // Quick-look cardinal directions + zenith — single fire. Cardinal looks keep
  // the current altitude and only spin the azimuth; zenith looks straight up.
  KeyboardListener.createGlobal(target, {
    keyStringProperties: HotkeyData.combineKeyStringProperties([
      ZenithHotkeyData.LOOK_NORTH,
      ZenithHotkeyData.LOOK_SOUTH,
      ZenithHotkeyData.LOOK_EAST,
      ZenithHotkeyData.LOOK_WEST,
      ZenithHotkeyData.LOOK_ZENITH,
    ]),
    fireOnHold: false,
    fire: (_event, keysPressed) => {
      const alt = model.lookAltitudeDegProperty.value;
      if (ZenithHotkeyData.LOOK_NORTH.hasKeyStroke(keysPressed)) {
        model.lookToward(LOOK_NORTH_AZIMUTH_DEG, alt);
      } else if (ZenithHotkeyData.LOOK_SOUTH.hasKeyStroke(keysPressed)) {
        model.lookToward(LOOK_SOUTH_AZIMUTH_DEG, alt);
      } else if (ZenithHotkeyData.LOOK_EAST.hasKeyStroke(keysPressed)) {
        model.lookToward(LOOK_EAST_AZIMUTH_DEG, alt);
      } else if (ZenithHotkeyData.LOOK_WEST.hasKeyStroke(keysPressed)) {
        model.lookToward(LOOK_WEST_AZIMUTH_DEG, alt);
      } else if (ZenithHotkeyData.LOOK_ZENITH.hasKeyStroke(keysPressed)) {
        model.lookToward(model.lookAzimuthDegProperty.value, LOOK_ZENITH_ALTITUDE_DEG);
      }
    },
  });

  // Time-rate ladder (Stellarium-style J / K / L) — single fire per step.
  KeyboardListener.createGlobal(target, {
    keyStringProperties: HotkeyData.combineKeyStringProperties([
      ZenithHotkeyData.TIME_SLOWER,
      ZenithHotkeyData.TIME_NORMAL,
      ZenithHotkeyData.TIME_FASTER,
    ]),
    fireOnHold: false,
    fire: (_event, keysPressed) => {
      if (ZenithHotkeyData.TIME_SLOWER.hasKeyStroke(keysPressed)) {
        model.decreaseTimeRate();
      } else if (ZenithHotkeyData.TIME_FASTER.hasKeyStroke(keysPressed)) {
        model.increaseTimeRate();
      } else if (ZenithHotkeyData.TIME_NORMAL.hasKeyStroke(keysPressed)) {
        model.resetTimeRate();
      }
    },
  });

  // ±1 sidereal day — hold-repeatable so learners can sweep several days.
  KeyboardListener.createGlobal(target, {
    keyStringProperties: HotkeyData.combineKeyStringProperties([
      ZenithHotkeyData.TIME_DAY_FORWARD,
      ZenithHotkeyData.TIME_DAY_BACKWARD,
    ]),
    fireOnHold: true,
    fire: (_event, keysPressed) => {
      const sign = ZenithHotkeyData.TIME_DAY_FORWARD.hasKeyStroke(keysPressed) ? 1 : -1;
      model.advanceSiderealTime(sign * HOURS_PER_SIDEREAL_DAY);
    },
  });

  // Display-option toggles — single fire, mirroring the panel checkboxes.
  const toggleBoolean = (property: { value: boolean }): void => {
    property.value = !property.value;
  };
  KeyboardListener.createGlobal(target, {
    keyStringProperties: HotkeyData.combineKeyStringProperties([
      ZenithHotkeyData.TOGGLE_ATMOSPHERE,
      ZenithHotkeyData.TOGGLE_HORIZON,
      ZenithHotkeyData.TOGGLE_CARDINALS,
      ZenithHotkeyData.TOGGLE_GRID,
      ZenithHotkeyData.TOGGLE_EQUATORIAL_GRID,
      ZenithHotkeyData.TOGGLE_MERIDIAN,
    ]),
    fireOnHold: false,
    fire: (_event, keysPressed) => {
      if (ZenithHotkeyData.TOGGLE_ATMOSPHERE.hasKeyStroke(keysPressed)) {
        toggleBoolean(model.showAtmosphereProperty);
      } else if (ZenithHotkeyData.TOGGLE_HORIZON.hasKeyStroke(keysPressed)) {
        toggleBoolean(model.showHorizonProperty);
      } else if (ZenithHotkeyData.TOGGLE_CARDINALS.hasKeyStroke(keysPressed)) {
        toggleBoolean(model.showCardinalsProperty);
      } else if (ZenithHotkeyData.TOGGLE_GRID.hasKeyStroke(keysPressed)) {
        toggleBoolean(model.showGridProperty);
      } else if (ZenithHotkeyData.TOGGLE_EQUATORIAL_GRID.hasKeyStroke(keysPressed)) {
        toggleBoolean(model.showEquatorialGridProperty);
      } else if (ZenithHotkeyData.TOGGLE_MERIDIAN.hasKeyStroke(keysPressed)) {
        toggleBoolean(model.showMeridianProperty);
      }
    },
  });

  // Wheel zooms the field of view (narrower = zoom in).
  target.addInputListener({
    wheel: (event) => {
      const domEvent = event.domEvent;
      if (!(domEvent instanceof WheelEvent)) {
        return;
      }
      model.zoomBy(Math.sign(domEvent.deltaY) * FOV_WHEEL_STEP_DEG);
      event.abort();
    },
  });

  // Hover identifies the nearest object under the pointer without a click.
  target.addInputListener({
    move: (event) => {
      skyNode.updateHover(skyNode.globalToLocalPoint(event.pointer.point));
    },
    exit: () => skyNode.updateHover(null),
  });

  return target;
};
