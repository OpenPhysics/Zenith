/**
 * attachPlanetariumInteraction.ts
 *
 * Pointer + keyboard camera control for the first-person planetarium FOV:
 *   - plain drag / arrow keys       → pan look az/alt
 *   - Ctrl/Meta-drag / Ctrl+arrows  → advance civil time (LST follows)
 *   - click (small motion)          → select nearest named star / planet
 *   - N / P                         → cycle selectable objects in the FOV
 *   - Escape                        → clear selection
 *   - wheel                         → change FOV
 */

import { PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp, Vector2 } from "scenerystack/dot";
import { DragListener, KeyboardListener, type Node } from "scenerystack/scenery";
import { allPlanetEquatorialStates } from "../../common/sky/PlanetEphemeris.js";
import { equatorialToHorizontal } from "../../common/sky/SkyCoordinates.js";
import ZenithHotkeyData from "../../common/ZenithHotkeyData.js";
import { StringManager } from "../../i18n/StringManager.js";
import {
  FIELD_OF_VIEW_RANGE,
  LOOK_ALTITUDE_RANGE,
  LOOK_PAN_DEG_PER_PIXEL,
  LOOK_PAN_KEYBOARD_STEP_DEG,
  TIME_DRAG_HOURS_PER_PIXEL,
  TIME_KEYBOARD_STEP_HOURS,
} from "../../SimConstants.js";
import type { SelectedSkyObject } from "../model/SelectedSkyObject.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import type { PlanetariumSkyNode } from "./PlanetariumSkyNode.js";
import { wrapLookAzimuth } from "./PlanetariumSkyNode.js";

/** Max pointer travel (view px) still treated as a click rather than a pan. */
const CLICK_MOVE_THRESHOLD_PX = 6;

export type AttachPlanetariumInteractionOptions = {
  model: ZenithModel;
  skyNode: PlanetariumSkyNode;
  accessibleNameProperty: TReadOnlyProperty<string>;
  accessibleHelpTextProperty?: TReadOnlyProperty<string>;
};

const formatHours = (hours: number): string => hours.toFixed(2);
const formatDeg = (deg: number): string => deg.toFixed(1);
const formatMag = (mag: number): string => mag.toFixed(2);

const announceSelection = (target: Node, model: ZenithModel, selected: SelectedSkyObject | null): void => {
  const a11y = StringManager.getInstance().getA11yStrings();
  if (!selected) {
    target.addAccessibleResponse(a11y.selectionClearedStringProperty);
    return;
  }

  const bodies = StringManager.getInstance().getBodies();
  const stars = StringManager.getInstance().getStars();
  let name = "";
  let mag = 0;
  let raHours = 0;
  let decDeg = 0;
  let altDeg = 0;
  let azDeg = 0;

  const lat = model.latitudeProperty.value;
  const lon = model.longitudeProperty.value;
  const lst = model.localSiderealTimeHoursProperty.value;
  const civilMs = model.civilTimeMsProperty.value;

  if (selected.kind === "star") {
    const key = `${selected.id}StringProperty` as keyof typeof stars;
    name = (stars[key] as TReadOnlyProperty<string>).value;
    mag = selected.mag;
    raHours = selected.raHours;
    decDeg = selected.decDeg;
    const horiz = equatorialToHorizontal(raHours, decDeg, lat, lst);
    altDeg = horiz.altDeg;
    azDeg = horiz.azDeg;
  } else {
    const bodyKey = `${selected.id}StringProperty` as keyof typeof bodies;
    name = (bodies[bodyKey] as TReadOnlyProperty<string>).value;
    const entry = allPlanetEquatorialStates(civilMs, lat, lon).find((s) => s.bodyId === selected.id);
    if (!entry) {
      return;
    }
    mag = entry.state.mag;
    raHours = entry.state.raHours;
    decDeg = entry.state.decDeg;
    const horiz = equatorialToHorizontal(raHours, decDeg, lat, lst);
    altDeg = horiz.altDeg;
    azDeg = horiz.azDeg;
  }

  target.addAccessibleResponse(
    new PatternStringProperty(a11y.selectedAnnouncementStringProperty, {
      name,
      mag: formatMag(mag),
      ra: formatHours(raHours),
      dec: formatDeg(decDeg),
      alt: formatDeg(altDeg),
      az: formatDeg(azDeg),
    }),
  );
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

  target.tagName = "div";
  target.focusable = true;
  target.accessibleName = accessibleNameProperty;
  if (accessibleHelpTextProperty) {
    target.accessibleHelpText = accessibleHelpTextProperty;
  }

  let lastX = 0;
  let lastY = 0;
  let startX = 0;
  let startY = 0;
  let dragMode: "pan" | "time" = "pan";
  let totalMove = 0;

  const panBy = (dAzDeg: number, dAltDeg: number): void => {
    model.lookAzimuthDegProperty.value = wrapLookAzimuth(model.lookAzimuthDegProperty.value + dAzDeg);
    model.lookAltitudeDegProperty.value = clamp(
      model.lookAltitudeDegProperty.value + dAltDeg,
      LOOK_ALTITUDE_RANGE.min,
      LOOK_ALTITUDE_RANGE.max,
    );
  };

  const setSelection = (selected: SelectedSkyObject | null): void => {
    model.selectedObjectProperty.value = selected;
    announceSelection(target, model, selected);
  };

  target.addInputListener(
    new DragListener({
      start: (event) => {
        const domEvent = event.domEvent as { ctrlKey?: boolean; metaKey?: boolean } | null;
        lastX = event.pointer.point.x;
        lastY = event.pointer.point.y;
        startX = lastX;
        startY = lastY;
        totalMove = 0;
        dragMode = domEvent?.ctrlKey || domEvent?.metaKey ? "time" : "pan";
      },
      drag: (event) => {
        const p = event.pointer.point;
        const dx = p.x - lastX;
        const dy = lastY - p.y;
        totalMove = Math.hypot(p.x - startX, p.y - startY);
        if (dragMode === "time") {
          model.advanceSiderealTime(-dx * TIME_DRAG_HOURS_PER_PIXEL);
        } else {
          // Drag right → look toward higher azimuth (sky appears to move left).
          panBy(dx * LOOK_PAN_DEG_PER_PIXEL, dy * LOOK_PAN_DEG_PER_PIXEL);
        }
        lastX = p.x;
        lastY = p.y;
      },
      end: (event) => {
        if (!event || dragMode !== "pan" || totalMove > CLICK_MOVE_THRESHOLD_PX) {
          return;
        }
        const localPoint = skyNode.globalToLocalPoint(event.pointer.point);
        const selected = skyNode.findNearestObject(new Vector2(localPoint.x, localPoint.y));
        setSelection(selected);
      },
    }),
  );

  target.addInputListener(
    new KeyboardListener({
      keys: [
        ...ZenithHotkeyData.ARROW_KEYS,
        ...ZenithHotkeyData.ADVANCE_CIVIL_TIME_LISTENER_KEYS,
        ...ZenithHotkeyData.CLEAR_SELECTION_KEYS,
      ],
      fireOnHold: true,
      fire: (_event, keysPressed) => {
        if (keysPressed === "escape") {
          setSelection(null);
          return;
        }
        if (keysPressed === "ctrl+arrowLeft" || keysPressed === "meta+arrowLeft") {
          model.advanceSiderealTime(TIME_KEYBOARD_STEP_HOURS);
          return;
        }
        if (keysPressed === "ctrl+arrowRight" || keysPressed === "meta+arrowRight") {
          model.advanceSiderealTime(-TIME_KEYBOARD_STEP_HOURS);
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

  // Discrete object cycling — no hold-repeat (unlike pan).
  target.addInputListener(
    new KeyboardListener({
      keys: [...ZenithHotkeyData.SELECT_NEXT_KEYS, ...ZenithHotkeyData.SELECT_PREVIOUS_KEYS],
      fireOnHold: false,
      fire: (_event, keysPressed) => {
        if (keysPressed === "n") {
          cycleSelection(model, skyNode, 1);
          announceSelection(target, model, model.selectedObjectProperty.value);
        } else if (keysPressed === "p") {
          cycleSelection(model, skyNode, -1);
          announceSelection(target, model, model.selectedObjectProperty.value);
        }
      },
    }),
  );

  // Wheel zooms FOV (narrower = zoom in).
  target.addInputListener({
    wheel: (event) => {
      const domEvent = event.domEvent as WheelEvent | null;
      if (!domEvent) {
        return;
      }
      const delta = Math.sign(domEvent.deltaY) * 5;
      model.fieldOfViewDegProperty.value = clamp(
        model.fieldOfViewDegProperty.value + delta,
        FIELD_OF_VIEW_RANGE.min,
        FIELD_OF_VIEW_RANGE.max,
      );
      event.abort();
    },
  });

  return target;
};
