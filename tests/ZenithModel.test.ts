/**
 * ZenithModel.test.ts
 *
 * Covers observer defaults, look/FOV state, civil-time advance, and LST sync.
 */

import { TimeSpeed } from "scenerystack/scenery-phet";
import { beforeEach, describe, expect, it } from "vitest";
import { localSiderealTimeHours } from "../src/common/sky/PlanetEphemeris.js";
import { ZenithPreferencesModel } from "../src/preferences/ZenithPreferencesModel.js";
import {
  CIVIL_HOURS_PER_SIM_SECOND,
  DEFAULT_CIVIL_TIME_MS,
  DEFAULT_FIELD_OF_VIEW_DEG,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  DEFAULT_LOOK_ALTITUDE_DEG,
  DEFAULT_LOOK_AZIMUTH_DEG,
} from "../src/SimConstants.js";
import { EPOCH_PRESET_CIVIL_MS, EpochPreset } from "../src/zenith-screen/model/EpochPreset.js";
import { LocationPreset } from "../src/zenith-screen/model/LocationPreset.js";
import { ZenithModel } from "../src/zenith-screen/model/ZenithModel.js";

describe("ZenithModel", () => {
  let preferences: ZenithPreferencesModel;
  let model: ZenithModel;

  beforeEach(() => {
    preferences = new ZenithPreferencesModel();
    model = new ZenithModel(preferences);
  });

  it("starts with Boulder defaults, southward look, epoch civil time, and a playing timer", () => {
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE_DEG);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE_DEG);
    expect(model.civilTimeMsProperty.value).toBe(DEFAULT_CIVIL_TIME_MS);
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(
      localSiderealTimeHours(DEFAULT_CIVIL_TIME_MS, DEFAULT_LONGITUDE_DEG),
      10,
    );
    expect(model.lookAzimuthDegProperty.value).toBe(DEFAULT_LOOK_AZIMUTH_DEG);
    expect(model.lookAltitudeDegProperty.value).toBe(DEFAULT_LOOK_ALTITUDE_DEG);
    expect(model.fieldOfViewDegProperty.value).toBe(DEFAULT_FIELD_OF_VIEW_DEG);
    expect(model.showPlanetsProperty.value).toBe(true);
    expect(model.trueScaleBodiesProperty.value).toBe(false);
    expect(model.showAtmosphereProperty.value).toBe(true);
    expect(model.timer.isPlayingProperty.value).toBe(true);
    expect(model.timeSpeedProperty.value).toBe(TimeSpeed.NORMAL);
  });

  it("advances civil time while playing at NORMAL speed and keeps LST in sync", () => {
    model.step(2);
    const expectedCivil = DEFAULT_CIVIL_TIME_MS + 2 * CIVIL_HOURS_PER_SIM_SECOND * 3600 * 1000;
    expect(model.civilTimeMsProperty.value).toBe(expectedCivil);
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(
      localSiderealTimeHours(expectedCivil, DEFAULT_LONGITUDE_DEG),
      10,
    );
  });

  it("scales civil advance by TimeSpeed.FAST", () => {
    model.timeSpeedProperty.value = TimeSpeed.FAST;
    model.step(1);
    const expectedCivil = DEFAULT_CIVIL_TIME_MS + 4 * CIVIL_HOURS_PER_SIM_SECOND * 3600 * 1000;
    expect(model.civilTimeMsProperty.value).toBe(expectedCivil);
  });

  it("does not advance when paused", () => {
    model.timer.isPlayingProperty.value = false;
    const lst0 = model.localSiderealTimeHoursProperty.value;
    model.step(10);
    expect(model.civilTimeMsProperty.value).toBe(DEFAULT_CIVIL_TIME_MS);
    expect(model.localSiderealTimeHoursProperty.value).toBe(lst0);
  });

  it("resyncs LST when longitude changes", () => {
    model.longitudeProperty.value = 0;
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(
      localSiderealTimeHours(DEFAULT_CIVIL_TIME_MS, 0),
      10,
    );
  });

  it("wraps sidereal time into [0, 24) via civil-time scrub", () => {
    model.advanceSiderealTime(30);
    expect(model.localSiderealTimeHoursProperty.value).toBeGreaterThanOrEqual(0);
    expect(model.localSiderealTimeHoursProperty.value).toBeLessThan(24);
  });

  it("advances local sidereal time by the requested sidereal hours", () => {
    const lst0 = model.localSiderealTimeHoursProperty.value;
    model.advanceSiderealTime(6);
    // GAST is not perfectly linear, so allow a couple of arcseconds of slack.
    const expected = (((lst0 + 6) % 24) + 24) % 24;
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(expected, 3);
  });

  it("returns the star field to place after one full sidereal day, with civil time ~23h56m", () => {
    const lst0 = model.localSiderealTimeHoursProperty.value;
    const civil0 = model.civilTimeMsProperty.value;
    model.advanceSiderealTime(24);
    const civilHoursAdvanced = (model.civilTimeMsProperty.value - civil0) / (3600 * 1000);
    // A sidereal day is ~23h56m of civil time — the sidereal-vs-solar distinction.
    expect(civilHoursAdvanced).toBeGreaterThan(23.9);
    expect(civilHoursAdvanced).toBeLessThan(24);
    // LST (and therefore the stars) returns to place far more precisely than the
    // ~3.9 min error a naive 24h civil scrub would leave.
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(lst0, 2);
  });

  it("reset restores look, FOV, session toggles, civil time, and observer state", () => {
    model.latitudeProperty.value = 10;
    model.longitudeProperty.value = 20;
    model.lookAzimuthDegProperty.value = 90;
    model.lookAltitudeDegProperty.value = 40;
    model.fieldOfViewDegProperty.value = 60;
    model.showGridProperty.value = false;
    model.showPlanetsProperty.value = false;
    model.trueScaleBodiesProperty.value = true;
    model.showAtmosphereProperty.value = false;
    model.showStarLabelsProperty.value = false;
    model.showConstellationsProperty.value = true;
    model.showPlanetLabelsProperty.value = false;
    model.magnitudeLimitProperty.value = 3;
    model.selectedObjectProperty.value = {
      kind: "star",
      id: "vega",
      raHours: 18.6,
      decDeg: 38.8,
      mag: 0.03,
    };
    model.step(5);
    model.reset();
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE_DEG);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE_DEG);
    expect(model.civilTimeMsProperty.value).toBe(DEFAULT_CIVIL_TIME_MS);
    expect(model.localSiderealTimeHoursProperty.value).toBeCloseTo(
      localSiderealTimeHours(DEFAULT_CIVIL_TIME_MS, DEFAULT_LONGITUDE_DEG),
      10,
    );
    expect(model.lookAzimuthDegProperty.value).toBe(DEFAULT_LOOK_AZIMUTH_DEG);
    expect(model.lookAltitudeDegProperty.value).toBe(DEFAULT_LOOK_ALTITUDE_DEG);
    expect(model.fieldOfViewDegProperty.value).toBe(DEFAULT_FIELD_OF_VIEW_DEG);
    expect(model.showGridProperty.value).toBe(true);
    expect(model.showPlanetsProperty.value).toBe(true);
    expect(model.trueScaleBodiesProperty.value).toBe(false);
    expect(model.showAtmosphereProperty.value).toBe(true);
    // Preference-backed overlays outlive Reset All.
    expect(model.showStarLabelsProperty.value).toBe(false);
    expect(model.showConstellationsProperty.value).toBe(true);
    expect(model.showPlanetLabelsProperty.value).toBe(false);
    expect(model.magnitudeLimitProperty.value).toBe(5.5);
    expect(model.selectedObjectProperty.value).toBeNull();
    expect(model.timer.timeProperty.value).toBe(0);
  });

  it("derives solar altitude above 50° at Boulder near local noon on the June solstice", () => {
    expect(model.solarAltitudeDegProperty.value).toBeGreaterThan(50);
  });

  it("applies location presets to latitude and longitude", () => {
    model.locationPresetProperty.value = LocationPreset.GREENWICH;
    expect(model.latitudeProperty.value).toBe(51.5);
    expect(model.longitudeProperty.value).toBe(0);
  });

  it("marks location CUSTOM when latitude is scrubbed manually", () => {
    model.latitudeProperty.value = 12;
    expect(model.locationPresetProperty.value).toBe(LocationPreset.CUSTOM);
  });

  it("applies epoch presets to civil time", () => {
    model.epochPresetProperty.value = EpochPreset.DECEMBER_SOLSTICE;
    expect(model.civilTimeMsProperty.value).toBe(EPOCH_PRESET_CIVIL_MS.get(EpochPreset.DECEMBER_SOLSTICE));
  });

  it("marks epoch CUSTOM when civil time is set to an arbitrary date", () => {
    model.civilTimeMsProperty.value = Date.UTC(2020, 0, 1, 3, 0, 0);
    expect(model.epochPresetProperty.value).toBe(EpochPreset.CUSTOM);
    expect(model.civilTimeMsProperty.value).toBe(Date.UTC(2020, 0, 1, 3, 0, 0));
  });
});
