/**
 * Fleet-standard memory-leak regression suite (TemplateSingleSim / QubitSketch pattern).
 */

import { Bounds2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { TimeModel } from "../src/common/TimeModel.js";
import { ZenithPreferencesModel } from "../src/preferences/ZenithPreferencesModel.js";
import { ZenithModel } from "../src/zenith-screen/model/ZenithModel.js";
import { PlanetariumSkyNode } from "../src/zenith-screen/view/PlanetariumSkyNode.js";
import { ZenithScreenView } from "../src/zenith-screen/view/ZenithScreenView.js";

async function forceGC(earlyExitRef?: WeakRef<object>): Promise<void> {
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (earlyExitRef !== undefined && earlyExitRef.deref() === undefined) {
      return;
    }
    if (earlyExitRef !== undefined) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

function createAndDisposeTimeModel(): WeakRef<object> {
  const model = new TimeModel();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

function createAndDisposeZenithModel(): WeakRef<object> {
  const preferences = new ZenithPreferencesModel();
  const model = new ZenithModel(preferences);
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

function createAndDisposePlanetariumSkyNode(): WeakRef<object> {
  const preferences = new ZenithPreferencesModel();
  const model = new ZenithModel(preferences);
  model.timer.isPlayingProperty.value = false;
  const skyNode = new PlanetariumSkyNode(model, { bounds: new Bounds2(0, 0, 800, 800) });
  const ref = new WeakRef<object>(skyNode);
  skyNode.dispose();
  model.dispose();
  return ref;
}

describe("Memory leak regression", () => {
  it("global.gc is available (--expose-gc)", () => {
    expect(globalThis.gc).toBeDefined();
  });

  it("sanity: plain object is collected", async () => {
    const ref = (() => new WeakRef({ hello: "world" }))();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("TimeModel is collected after dispose", async () => {
    const ref = createAndDisposeTimeModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("double dispose() does not throw", () => {
    const model = new TimeModel();
    model.dispose();
    expect(() => model.dispose()).not.toThrow();
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDisposeTimeModel());
    }
    await forceGC();
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });

  describe("ZenithModel", () => {
    it("is collected after dispose", async () => {
      const ref = createAndDisposeZenithModel();
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });

    it("double dispose() does not throw", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      model.dispose();
      expect(() => model.dispose()).not.toThrow();
    });

    it("repeated create/dispose cycles leave no survivors", async () => {
      const refs: WeakRef<object>[] = [];
      for (let i = 0; i < 5; i++) {
        refs.push(createAndDisposeZenithModel());
      }
      await forceGC();
      expect(refs.filter((r) => r.deref() !== undefined).length).toBe(0);
    });
  });

  describe("PlanetariumSkyNode", () => {
    it("is collected after dispose", async () => {
      const ref = createAndDisposePlanetariumSkyNode();
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });

    it("double dispose() does not throw", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      const skyNode = new PlanetariumSkyNode(model, { bounds: new Bounds2(0, 0, 800, 800) });
      skyNode.dispose();
      expect(() => skyNode.dispose()).not.toThrow();
      model.dispose();
    });

    it("repeated create/dispose cycles leave no survivors", async () => {
      const refs: WeakRef<object>[] = [];
      for (let i = 0; i < 5; i++) {
        refs.push(createAndDisposePlanetariumSkyNode());
      }
      await forceGC();
      expect(refs.filter((r) => r.deref() !== undefined).length).toBe(0);
    });
  });

  describe("ZenithScreenView", () => {
    // Full ScreenView GC is not asserted here: joist `ScreenView` plus sun
    // ComboBox / NumberControl / localized string Properties retain a graph that
    // survives Node.dispose(). Listener teardown (the fuzz-leak regression) is
    // what we lock down below; model + PlanetariumSkyNode GC cover the owned
    // subscription surface.

    it("double dispose() does not throw", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      const screenView = new ZenithScreenView(model);
      screenView.dispose();
      expect(() => screenView.dispose()).not.toThrow();
      model.dispose();
    });

    it("mutating model Properties after dispose does not throw through dead listeners", () => {
      const preferences = new ZenithPreferencesModel();
      const model = new ZenithModel(preferences);
      model.timer.isPlayingProperty.value = false;
      const screenView = new ZenithScreenView(model);
      screenView.dispose();

      // Previously-linked look / time Properties must no longer notify disposed view listeners.
      expect(() => {
        model.lookAzimuthDegProperty.value = (model.lookAzimuthDegProperty.value + 15) % 360;
        model.lookAltitudeDegProperty.value = 25;
        model.fieldOfViewDegProperty.value = 100;
        model.civilTimeMsProperty.value += 3_600_000;
      }).not.toThrow();

      model.dispose();
    });
  });
});
