/**
 * ZenithModel.test.ts
 *
 * Covers observer defaults and sidereal-time advance while the clock plays.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  HOURS_PER_SIDEREAL_DAY,
  SIDEREAL_HOURS_PER_SIM_SECOND,
} from "../src/SimConstants.js";
import { ZenithModel } from "../src/zenith-screen/model/ZenithModel.js";

describe("ZenithModel", () => {
  let model: ZenithModel;

  beforeEach(() => {
    model = new ZenithModel();
  });

  it("starts with Boulder defaults and a playing timer", () => {
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE_DEG);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE_DEG);
    expect(model.localSiderealTimeHoursProperty.value).toBe(0);
    expect(model.timer.isPlayingProperty.value).toBe(true);
  });

  it("advances local sidereal time while playing", () => {
    model.step(3600); // one sim hour
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(3600 * SIDEREAL_HOURS_PER_SIM_SECOND, 10);
  });

  it("does not advance when paused", () => {
    model.timer.isPlayingProperty.value = false;
    model.step(3600);
    expect(model.localSiderealTimeHoursProperty.value).toBe(0);
  });

  it("wraps sidereal time into [0, 24)", () => {
    model.localSiderealTimeHoursProperty.value = HOURS_PER_SIDEREAL_DAY - 0.25;
    // Advance enough sim time for 0.5 sidereal hours
    model.step(0.5 / SIDEREAL_HOURS_PER_SIM_SECOND);
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(0.25, 10);
  });

  it("reset restores initial state", () => {
    model.latitudeProperty.value = 10;
    model.longitudeProperty.value = 20;
    model.step(100);
    model.reset();
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE_DEG);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE_DEG);
    expect(model.localSiderealTimeHoursProperty.value).toBe(0);
    expect(model.timer.timeProperty.value).toBe(0);
  });
});
