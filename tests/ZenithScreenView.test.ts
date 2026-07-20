/**
 * ZenithScreenView.test.ts
 *
 * Public construction / layout / reset behavior — no render-output assertions.
 */

import { Bounds2 } from "scenerystack/dot";
import { AccordionBox } from "scenerystack/sun";
import { beforeEach, describe, expect, it } from "vitest";
import { ZenithPreferencesModel } from "../src/preferences/ZenithPreferencesModel.js";
import { SCREEN_VIEW_MARGIN } from "../src/ZenithConstants.js";
import { ZenithModel } from "../src/zenith-screen/model/ZenithModel.js";
import { ZenithScreenView } from "../src/zenith-screen/view/ZenithScreenView.js";

describe("ZenithScreenView", () => {
  let preferences: ZenithPreferencesModel;
  let model: ZenithModel;
  let screenView: ZenithScreenView;

  beforeEach(() => {
    preferences = new ZenithPreferencesModel();
    model = new ZenithModel(preferences);
    model.timer.isPlayingProperty.value = false;
    screenView = new ZenithScreenView(model);
  });

  it("constructs without throwing and adds sky + chrome children", () => {
    expect(screenView).toBeInstanceOf(ZenithScreenView);
    // Background, sky, selection panel, hint, location, time, control, search,
    // reset, info, plus the PDOM-order wrapper — well above a bare ScreenView.
    expect(screenView.children.length).toBeGreaterThan(8);
  });

  it("re-anchors chrome when visibleBounds changes", () => {
    const wide = new Bounds2(0, 0, 1200, 800);
    screenView.visibleBoundsProperty.value = wide;

    const boxes = screenView.children.filter((child): child is AccordionBox => child instanceof AccordionBox);
    expect(boxes.length).toBeGreaterThanOrEqual(2);

    const leftAnchored = boxes.find((box) => Math.abs(box.left - (wide.minX + SCREEN_VIEW_MARGIN)) < 0.5);
    const rightAnchored = boxes.find((box) => Math.abs(box.right - (wide.maxX - SCREEN_VIEW_MARGIN)) < 0.5);
    expect(leftAnchored).toBeDefined();
    expect(rightAnchored).toBeDefined();

    const shifted = new Bounds2(100, 50, 1300, 850);
    screenView.visibleBoundsProperty.value = shifted;

    const leftAfter = boxes.find((box) => Math.abs(box.left - (shifted.minX + SCREEN_VIEW_MARGIN)) < 0.5);
    const rightAfter = boxes.find((box) => Math.abs(box.right - (shifted.maxX - SCREEN_VIEW_MARGIN)) < 0.5);
    expect(leftAfter).toBeDefined();
    expect(rightAfter).toBeDefined();
  });

  it("reset() does not throw", () => {
    expect(() => screenView.reset()).not.toThrow();
  });
});
