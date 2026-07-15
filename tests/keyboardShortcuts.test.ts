import { describe, expect, it } from "vitest";
import ZenithHotkeyData from "../src/common/ZenithHotkeyData.js";

describe("Keyboard shortcut data", () => {
  it("display toggle hotkeys map to the expected single-letter keys", () => {
    expect(ZenithHotkeyData.TOGGLE_ATMOSPHERE.hasKeyStroke("a")).toBe(true);
    expect(ZenithHotkeyData.TOGGLE_HORIZON.hasKeyStroke("g")).toBe(true);
    expect(ZenithHotkeyData.TOGGLE_CARDINALS.hasKeyStroke("q")).toBe(true);
    expect(ZenithHotkeyData.TOGGLE_GRID.hasKeyStroke("z")).toBe(true);
    expect(ZenithHotkeyData.TOGGLE_EQUATORIAL_GRID.hasKeyStroke("e")).toBe(true);
    expect(ZenithHotkeyData.TOGGLE_MERIDIAN.hasKeyStroke("m")).toBe(true);
  });

  it("display toggle keys do not collide with each other", () => {
    const allKeys = [
      ...ZenithHotkeyData.TOGGLE_ATMOSPHERE.keyStringProperties,
      ...ZenithHotkeyData.TOGGLE_HORIZON.keyStringProperties,
      ...ZenithHotkeyData.TOGGLE_CARDINALS.keyStringProperties,
      ...ZenithHotkeyData.TOGGLE_GRID.keyStringProperties,
      ...ZenithHotkeyData.TOGGLE_EQUATORIAL_GRID.keyStringProperties,
      ...ZenithHotkeyData.TOGGLE_MERIDIAN.keyStringProperties,
    ].map((p) => p.value);
    expect(new Set(allKeys).size).toBe(allKeys.length);
  });

  it("toggle keys do not collide with quick-look or other single-letter keys", () => {
    const toggleKeys = ["a", "g", "q", "z", "e", "m"];
    const otherKeys = [
      ...ZenithHotkeyData.SELECT_NEXT.keyStringProperties,
      ...ZenithHotkeyData.SELECT_PREVIOUS.keyStringProperties,
      ...ZenithHotkeyData.TRACK_OBJECT.keyStringProperties,
      ...ZenithHotkeyData.TIME_SLOWER.keyStringProperties,
      ...ZenithHotkeyData.TIME_NORMAL.keyStringProperties,
      ...ZenithHotkeyData.TIME_FASTER.keyStringProperties,
    ].map((p) => p.value);
    for (const tk of toggleKeys) {
      expect(otherKeys).not.toContain(tk);
    }
  });
});
