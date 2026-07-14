/**
 * ZenithModel.ts
 *
 * Top-level model for the planetarium screen. Civil time drives ephemerides and
 * local sidereal time (via astronomy-engine GAST + longitude). Look direction
 * (azimuth + altitude) and field of view form an aim-able first-person camera;
 * the view only observes these Properties.
 */
import {
  BooleanProperty,
  DerivedProperty,
  EnumerationProperty,
  Multilink,
  NumberProperty,
  Property,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import {
  allPlanetEquatorialStates,
  localSiderealTimeHours,
  type MoonPhaseState,
  moonPhaseState,
  type PlanetBodyId,
  type PlanetEquatorialState,
} from "../../common/sky/PlanetEphemeris.js";
import {
  angularSeparationDeg,
  type EquatorialCoordinates,
  equatorialToHorizontal,
} from "../../common/sky/SkyCoordinates.js";
import { TimeModel } from "../../common/TimeModel.js";
import type { ZenithPreferencesModel } from "../../preferences/ZenithPreferencesModel.js";
import zenithQueryParameters, { resolveCivilTimeMsFromQuery } from "../../preferences/zenithQueryParameters.js";
import {
  CIVIL_HOURS_PER_SIM_SECOND,
  DEFAULT_CIVIL_TIME_MS,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
  DEFAULT_LOOK_ALTITUDE_DEG,
  DEFAULT_LOOK_AZIMUTH_DEG,
  DEFAULT_SHOW_ATMOSPHERE,
  DEFAULT_SHOW_CARDINALS,
  DEFAULT_SHOW_CELESTIAL_EQUATOR,
  DEFAULT_SHOW_ECLIPTIC,
  DEFAULT_SHOW_EQUATORIAL_GRID,
  DEFAULT_SHOW_MERIDIAN,
  DEFAULT_SHOW_OBJECT_PATH,
  DEFAULT_SHOW_PLANETS,
  DEFAULT_TIME_RATE_INDEX,
  DEFAULT_TRUE_SCALE_BODIES,
  FIELD_OF_VIEW_RANGE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  LOOK_ALTITUDE_RANGE,
  MAGNITUDE_LIMIT_RANGE,
  SIDEREAL_HOURS_PER_SOLAR_HOUR,
  TIME_RATE_INDEX_RANGE,
  TIME_RATE_MULTIPLIERS,
} from "../../SimConstants.js";
import { DEFAULT_EPOCH_PRESET, EPOCH_PRESET_CIVIL_MS, EpochPreset } from "./EpochPreset.js";
import { DEFAULT_LOCATION_PRESET, LOCATION_PRESET_COORDS, LocationPreset } from "./LocationPreset.js";
import type { SelectedSkyObject } from "./SelectedSkyObject.js";

const MS_PER_HOUR = 3600 * 1000;

/**
 * Single instantaneous ephemeris for the whole solar system at one civil time /
 * observer, so every view consumer reads one computation instead of each
 * recomputing all bodies through astronomy-engine.
 */
export type SkySnapshot = {
  readonly bodies: ReadonlyArray<{ bodyId: PlanetBodyId; state: PlanetEquatorialState }>;
  readonly byId: ReadonlyMap<PlanetBodyId, PlanetEquatorialState>;
  readonly moonPhase: MoonPhaseState;
};

export class ZenithModel implements TModel {
  /** Play/pause + elapsed simulation time for sky animation. Starts playing. */
  public readonly timer = new TimeModel(true);

  /**
   * Index into {@link TIME_RATE_MULTIPLIERS}. Stepping this down/up walks the
   * playback rate from fast-forward through normal, across zero into reverse,
   * and on to fast-rewind. Drives {@link timeRateProperty}.
   */
  public readonly timeRateIndexProperty = new NumberProperty(DEFAULT_TIME_RATE_INDEX, {
    range: TIME_RATE_INDEX_RANGE,
    numberType: "Integer",
  });

  /**
   * Signed playback rate: a multiplier on the base educational time step. `1×`
   * is normal forward play; negative values run the clock backward.
   */
  public readonly timeRateProperty: TReadOnlyProperty<number>;

  /** Named location preset; CUSTOM when lat/lon are set manually. */
  public readonly locationPresetProperty: EnumerationProperty<LocationPreset>;

  /** Named civil-time jump preset; CUSTOM when time is scrubbed or played. */
  public readonly epochPresetProperty: EnumerationProperty<EpochPreset>;

  /** Observer geographic latitude in degrees (+N). */
  public readonly latitudeProperty: NumberProperty;

  /** Observer geographic longitude in degrees (+E). */
  public readonly longitudeProperty: NumberProperty;

  /**
   * Civil time as UTC milliseconds since epoch. Ephemerides and LST are derived
   * from this value. Advances while the timer is playing.
   */
  public readonly civilTimeMsProperty: NumberProperty;

  /**
   * Local sidereal time in hours, wrapped to [0, 24).
   * Synced from civil time + longitude (not an independent free clock).
   */
  public readonly localSiderealTimeHoursProperty: NumberProperty;

  /** View center azimuth in degrees (N=0 → E). */
  public readonly lookAzimuthDegProperty: NumberProperty;

  /** View center altitude in degrees. */
  public readonly lookAltitudeDegProperty: NumberProperty;

  /** Horizontal field of view in degrees. */
  public readonly fieldOfViewDegProperty: NumberProperty;

  /** Whether alt/az grid overlays are drawn. */
  public readonly showGridProperty: BooleanProperty;

  /** Whether N/S/E/W labels and a zenith marker are drawn. */
  public readonly showCardinalsProperty: BooleanProperty;

  /** Whether the local meridian (north–south great-circle arc) is drawn. */
  public readonly showMeridianProperty: BooleanProperty;

  /** Whether a coarse equatorial RA/Dec grid is drawn. */
  public readonly showEquatorialGridProperty: BooleanProperty;

  /** Whether the ground band and horizon line are drawn. */
  public readonly showHorizonProperty: BooleanProperty;

  /**
   * Whether atmospheric scattering is drawn: twilight sky colors and daytime
   * star fade. Off → night sky with stars always visible (Stellarium-style).
   */
  public readonly showAtmosphereProperty: BooleanProperty;

  /** Whether Sun / Moon / planets are drawn. */
  public readonly showPlanetsProperty: BooleanProperty;

  /**
   * When true, planet discs use true apparent angular size (like the Sun and
   * Moon always do). When false, planets stay exaggerated for visibility.
   */
  public readonly trueScaleBodiesProperty: BooleanProperty;

  /**
   * Whether preferred planet name labels are drawn.
   * Backed by Preferences → Simulation (outlives Reset All).
   */
  public readonly showPlanetLabelsProperty: BooleanProperty;

  /**
   * Whether curated bright-star name labels are drawn.
   * Backed by Preferences → Simulation (outlives Reset All).
   */
  public readonly showStarLabelsProperty: BooleanProperty;

  /**
   * Whether classroom constellation stick figures are drawn.
   * Backed by Preferences → Simulation (outlives Reset All).
   */
  public readonly showConstellationsProperty: BooleanProperty;

  /**
   * Whether the deeper Hipparcos star catalog (mag <= 7.5) replaces the
   * bright-star catalog during rendering.
   * Backed by Preferences → Simulation (outlives Reset All).
   */
  public readonly deepStarCatalogProperty: BooleanProperty;

  /** Whether the ecliptic (the Sun's yearly path) is drawn. */
  public readonly showEclipticProperty: BooleanProperty;

  /** Whether the celestial equator (Dec 0°) is drawn. */
  public readonly showCelestialEquatorProperty: BooleanProperty;

  /** Whether the selected object's 24 h diurnal path across the sky is drawn. */
  public readonly showObjectPathProperty: BooleanProperty;

  /** Hide stars fainter than this visual magnitude. */
  public readonly magnitudeLimitProperty: NumberProperty;

  /** Currently selected sky object, or null when nothing is selected. */
  public readonly selectedObjectProperty: Property<SelectedSkyObject | null>;

  /**
   * When true, the first-person camera stays centered on the selected object as
   * time advances — so a learner watches a star arc across the sky or a planet
   * drift against the background. A manual pan cancels it (see the look links).
   */
  public readonly trackSelectedObjectProperty = new BooleanProperty(false);

  /**
   * Angular-distance tool endpoints as fixed equatorial coordinates (so they
   * track the stars as the sky rotates). Null until the learner places them.
   */
  public readonly measureStartProperty: Property<EquatorialCoordinates | null>;
  public readonly measureEndProperty: Property<EquatorialCoordinates | null>;

  /** Angular separation (degrees) between the two measure endpoints, or null. */
  public readonly measureSeparationDegProperty: TReadOnlyProperty<number | null>;

  /**
   * Instantaneous ephemeris of all solar-system bodies (plus Moon phase) for the
   * current civil time and observer. The single source of truth every view reads
   * so the ephemeris is computed once per time / location change, not per node.
   */
  public readonly skySnapshotProperty: TReadOnlyProperty<SkySnapshot>;

  /**
   * Solar altitude in degrees for the current observer / civil time.
   * Drives the twilight sky gradient and daytime star fade in the view.
   */
  public readonly solarAltitudeDegProperty: TReadOnlyProperty<number>;

  /** Suppresses CUSTOM marking while applying a named location/epoch preset. */
  private applyingPreset = false;

  /**
   * True while the object tracker is writing the look direction, so those writes
   * don't count as a manual pan and cancel tracking.
   */
  private trackingLook = false;

  public constructor(preferences: ZenithPreferencesModel) {
    // Startup values from public query parameters (teacher deep-links).
    const startLat = zenithQueryParameters["lat"];
    const startLon = zenithQueryParameters["lon"];
    const startCivilMs = resolveCivilTimeMsFromQuery(zenithQueryParameters["date"]);
    const startFov = zenithQueryParameters["fov"];
    const startMagLimit = zenithQueryParameters["magLimit"];

    const locationMatchesDefault = startLat === DEFAULT_LATITUDE_DEG && startLon === DEFAULT_LONGITUDE_DEG;
    const epochMatchesDefault = startCivilMs === DEFAULT_CIVIL_TIME_MS;

    this.locationPresetProperty = new EnumerationProperty(
      locationMatchesDefault ? DEFAULT_LOCATION_PRESET : LocationPreset.CUSTOM,
    );
    this.epochPresetProperty = new EnumerationProperty(epochMatchesDefault ? DEFAULT_EPOCH_PRESET : EpochPreset.CUSTOM);
    this.latitudeProperty = new NumberProperty(startLat, {
      range: LATITUDE_RANGE,
    });
    this.longitudeProperty = new NumberProperty(startLon, {
      range: LONGITUDE_RANGE,
    });
    this.civilTimeMsProperty = new NumberProperty(startCivilMs);
    this.localSiderealTimeHoursProperty = new NumberProperty(localSiderealTimeHours(startCivilMs, startLon));
    this.lookAzimuthDegProperty = new NumberProperty(DEFAULT_LOOK_AZIMUTH_DEG);
    this.lookAltitudeDegProperty = new NumberProperty(DEFAULT_LOOK_ALTITUDE_DEG, {
      range: LOOK_ALTITUDE_RANGE,
    });
    this.fieldOfViewDegProperty = new NumberProperty(startFov, {
      range: FIELD_OF_VIEW_RANGE,
    });
    this.showGridProperty = new BooleanProperty(true);
    this.showCardinalsProperty = new BooleanProperty(DEFAULT_SHOW_CARDINALS);
    this.showMeridianProperty = new BooleanProperty(DEFAULT_SHOW_MERIDIAN);
    this.showEquatorialGridProperty = new BooleanProperty(DEFAULT_SHOW_EQUATORIAL_GRID);
    this.showEclipticProperty = new BooleanProperty(DEFAULT_SHOW_ECLIPTIC);
    this.showCelestialEquatorProperty = new BooleanProperty(DEFAULT_SHOW_CELESTIAL_EQUATOR);
    this.showObjectPathProperty = new BooleanProperty(DEFAULT_SHOW_OBJECT_PATH);
    this.showHorizonProperty = new BooleanProperty(true);
    // Showing the horizon again re-clamps a below-horizon view back up to it.
    // Guarded so this automatic re-clamp isn't mistaken for a manual pan.
    this.showHorizonProperty.lazyLink((show) => {
      if (show) {
        this.trackingLook = true;
        this.setLookAltitude(this.lookAltitudeDegProperty.value);
        this.trackingLook = false;
      }
    });
    this.showAtmosphereProperty = new BooleanProperty(DEFAULT_SHOW_ATMOSPHERE);
    this.showPlanetsProperty = new BooleanProperty(DEFAULT_SHOW_PLANETS);
    this.trueScaleBodiesProperty = new BooleanProperty(DEFAULT_TRUE_SCALE_BODIES);
    // Label / constellation overlays live in Preferences and are shared here.
    this.showPlanetLabelsProperty = preferences.showPlanetLabelsProperty;
    this.showStarLabelsProperty = preferences.showStarLabelsProperty;
    this.showConstellationsProperty = preferences.showConstellationsProperty;
    this.deepStarCatalogProperty = preferences.deepStarCatalogProperty;
    this.magnitudeLimitProperty = new NumberProperty(startMagLimit, {
      range: MAGNITUDE_LIMIT_RANGE,
    });
    this.selectedObjectProperty = new Property<SelectedSkyObject | null>(null);
    this.measureStartProperty = new Property<EquatorialCoordinates | null>(null);
    this.measureEndProperty = new Property<EquatorialCoordinates | null>(null);
    this.measureSeparationDegProperty = new DerivedProperty(
      [this.measureStartProperty, this.measureEndProperty],
      (a, b) => (a && b ? angularSeparationDeg(a.raHours, a.decDeg, b.raHours, b.decDeg) : null),
    );

    this.timeRateProperty = new DerivedProperty(
      [this.timeRateIndexProperty],
      (index) => TIME_RATE_MULTIPLIERS[index] ?? 1,
    );

    this.skySnapshotProperty = new DerivedProperty(
      [this.civilTimeMsProperty, this.latitudeProperty, this.longitudeProperty],
      (civilMs, lat, lon): SkySnapshot => {
        const bodies = allPlanetEquatorialStates(civilMs, lat, lon);
        const byId = new Map<PlanetBodyId, PlanetEquatorialState>(bodies.map((b) => [b.bodyId, b.state]));
        return { bodies, byId, moonPhase: moonPhaseState(civilMs) };
      },
    );

    this.solarAltitudeDegProperty = new DerivedProperty(
      [this.skySnapshotProperty, this.latitudeProperty, this.localSiderealTimeHoursProperty],
      (snapshot, lat, lst) => {
        const sun = snapshot.byId.get("sun");
        if (!sun) {
          return 0;
        }
        return equatorialToHorizontal(sun.raHours, sun.decDeg, lat, lst).altDeg;
      },
    );

    // Keep LST aligned when the user changes longitude without advancing time.
    this.longitudeProperty.lazyLink(() => this.syncLocalSiderealTime());
    this.civilTimeMsProperty.lazyLink(() => this.syncLocalSiderealTime());

    this.locationPresetProperty.lazyLink((preset) => {
      if (preset === LocationPreset.CUSTOM) {
        return;
      }
      const coords = LOCATION_PRESET_COORDS.get(preset);
      if (!coords) {
        return;
      }
      this.applyingPreset = true;
      this.latitudeProperty.value = coords.latitudeDeg;
      this.longitudeProperty.value = coords.longitudeDeg;
      this.applyingPreset = false;
    });

    this.epochPresetProperty.lazyLink((preset) => {
      if (preset === EpochPreset.CUSTOM) {
        return;
      }
      const civilMs = EPOCH_PRESET_CIVIL_MS.get(preset);
      if (civilMs === undefined) {
        return;
      }
      this.applyingPreset = true;
      this.civilTimeMsProperty.value = civilMs;
      this.applyingPreset = false;
      this.syncLocalSiderealTime();
    });

    const markLocationCustom = (): void => {
      if (!this.applyingPreset) {
        this.locationPresetProperty.value = LocationPreset.CUSTOM;
      }
    };
    this.latitudeProperty.lazyLink(markLocationCustom);
    this.longitudeProperty.lazyLink(markLocationCustom);

    this.civilTimeMsProperty.lazyLink(() => {
      if (!this.applyingPreset) {
        this.epochPresetProperty.value = EpochPreset.CUSTOM;
      }
    });

    // Keep the look centered on the selected object while tracking. Fires on link
    // so enabling Track re-centers immediately, then re-fires as time / location
    // moves the object across the sky.
    Multilink.multilink(
      [
        this.trackSelectedObjectProperty,
        this.selectedObjectProperty,
        this.skySnapshotProperty,
        this.latitudeProperty,
        this.localSiderealTimeHoursProperty,
      ],
      (tracking, selected, _snapshot, lat, lst) => {
        if (!(tracking && selected)) {
          return;
        }
        const eq = this.equatorialOfSelected(selected);
        if (!eq) {
          return;
        }
        const { altDeg, azDeg } = equatorialToHorizontal(eq.raHours, eq.decDeg, lat, lst);
        this.trackingLook = true;
        this.lookToward(azDeg, altDeg);
        this.trackingLook = false;
      },
    );

    // A manual pan (drag / arrow / quick-look) cancels tracking; the tracker's own
    // writes are guarded by trackingLook so they don't cancel it.
    const cancelTrackingOnManualLook = (): void => {
      if (!this.trackingLook) {
        this.trackSelectedObjectProperty.value = false;
      }
    };
    this.lookAzimuthDegProperty.lazyLink(cancelTrackingOnManualLook);
    this.lookAltitudeDegProperty.lazyLink(cancelTrackingOnManualLook);
  }

  /** Steps the playback rate one notch faster / toward forward (undoes a decrease). */
  public increaseTimeRate(): void {
    this.timeRateIndexProperty.value = Math.min(TIME_RATE_INDEX_RANGE.max, this.timeRateIndexProperty.value + 1);
  }

  /** Steps the playback rate one notch slower; past `1×` it crosses into reverse. */
  public decreaseTimeRate(): void {
    this.timeRateIndexProperty.value = Math.max(TIME_RATE_INDEX_RANGE.min, this.timeRateIndexProperty.value - 1);
  }

  /** Restores the playback rate to normal forward (`1×`). */
  public resetTimeRate(): void {
    this.timeRateIndexProperty.value = DEFAULT_TIME_RATE_INDEX;
  }

  /** Jumps civil time to the observer's real-world current instant ("Now"). */
  public setToNow(): void {
    this.civilTimeMsProperty.value = Date.now();
  }

  /**
   * Lowest altitude the view center may drop to. With the horizon (ground)
   * shown, looking below it reveals only opaque ground, so the downward look is
   * clamped at the horizon; hiding the horizon frees the view to the nadir.
   */
  public get lookAltitudeMinDeg(): number {
    return this.showHorizonProperty.value ? 0 : this.lookAltitudeDegProperty.range.min;
  }

  /** Sets the view-center altitude, constrained to the currently-allowed range. */
  public setLookAltitude(altitudeDeg: number): void {
    const range = this.lookAltitudeDegProperty.range;
    this.lookAltitudeDegProperty.value = Math.min(range.max, Math.max(this.lookAltitudeMinDeg, altitudeDeg));
  }

  /**
   * Points the first-person camera at an absolute azimuth / altitude (degrees).
   * Azimuth is wrapped into [0, 360); altitude is range-constrained to the view.
   */
  public lookToward(azimuthDeg: number, altitudeDeg: number): void {
    this.lookAzimuthDegProperty.value = ((azimuthDeg % 360) + 360) % 360;
    this.setLookAltitude(altitudeDeg);
  }

  /**
   * Zooms the field of view by `deltaDeg` (negative narrows the FOV = zoom in,
   * positive widens = zoom out), clamped to the allowed FOV range.
   */
  public zoomBy(deltaDeg: number): void {
    this.fieldOfViewDegProperty.value = this.fieldOfViewDegProperty.range.constrainValue(
      this.fieldOfViewDegProperty.value + deltaDeg,
    );
  }

  /** Recompute LST from civil time + longitude. */
  public syncLocalSiderealTime(): void {
    this.localSiderealTimeHoursProperty.value = localSiderealTimeHours(
      this.civilTimeMsProperty.value,
      this.longitudeProperty.value,
    );
  }

  /** Advances civil time by `hours` (educational scrub / Ctrl-drag). */
  public advanceCivilTimeHours(hours: number): void {
    this.civilTimeMsProperty.value += hours * MS_PER_HOUR;
    this.syncLocalSiderealTime();
  }

  /**
   * Advances the clock so local sidereal time — and therefore the star field —
   * moves by `siderealHours`. Because LST runs {@link SIDEREAL_HOURS_PER_SOLAR_HOUR}
   * times faster than the civil clock, this advances civil time slightly less,
   * so one full sidereal day (24 h) returns the stars exactly to place while the
   * Sun lags ~3 min 56 s behind — the sidereal-vs-solar distinction itself.
   */
  public advanceSiderealTime(siderealHours: number): void {
    this.advanceCivilTimeHours(siderealHours / SIDEREAL_HOURS_PER_SOLAR_HOUR);
  }

  /**
   * Resolves the current equatorial position and magnitude of a selected object.
   * Stars carry fixed J2000 coordinates; planets are read from the ephemeris
   * snapshot. Returns null when a selected planet is missing from the snapshot.
   */
  public equatorialOfSelected(selected: SelectedSkyObject): (EquatorialCoordinates & { mag: number }) | null {
    if (selected.kind === "star") {
      return { raHours: selected.raHours, decDeg: selected.decDeg, mag: selected.mag };
    }
    const state = this.skySnapshotProperty.value.byId.get(selected.id);
    if (!state) {
      return null;
    }
    return { raHours: state.raHours, decDeg: state.decDeg, mag: state.mag };
  }

  public clearSelection(): void {
    this.selectedObjectProperty.value = null;
  }

  /**
   * Places the next angular-distance endpoint. The first point starts a
   * measurement; the second completes it; a third starts a fresh one.
   */
  public addMeasurePoint(point: EquatorialCoordinates): void {
    if (!this.measureStartProperty.value || this.measureEndProperty.value) {
      this.measureStartProperty.value = point;
      this.measureEndProperty.value = null;
    } else {
      this.measureEndProperty.value = point;
    }
  }

  public clearMeasurement(): void {
    this.measureStartProperty.value = null;
    this.measureEndProperty.value = null;
  }

  public reset(): void {
    this.timer.reset();
    this.timeRateIndexProperty.reset();
    this.applyingPreset = true;
    this.locationPresetProperty.reset();
    this.epochPresetProperty.reset();
    this.latitudeProperty.reset();
    this.longitudeProperty.reset();
    this.civilTimeMsProperty.reset();
    this.applyingPreset = false;
    this.syncLocalSiderealTime();
    this.lookAzimuthDegProperty.reset();
    this.lookAltitudeDegProperty.reset();
    this.fieldOfViewDegProperty.reset();
    this.showGridProperty.reset();
    this.showCardinalsProperty.reset();
    this.showMeridianProperty.reset();
    this.showEquatorialGridProperty.reset();
    this.showEclipticProperty.reset();
    this.showCelestialEquatorProperty.reset();
    this.showObjectPathProperty.reset();
    this.showHorizonProperty.reset();
    this.showAtmosphereProperty.reset();
    this.showPlanetsProperty.reset();
    this.trueScaleBodiesProperty.reset();
    // Preference-backed overlays (star names, constellations, planet labels) are
    // not reset — they outlive Reset All.
    this.magnitudeLimitProperty.reset();
    this.selectedObjectProperty.reset();
    this.trackSelectedObjectProperty.reset();
    this.clearMeasurement();
  }

  public step(dt: number): void {
    this.timer.step(dt);
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.advanceCivilTimeHours(dt * CIVIL_HOURS_PER_SIM_SECOND * this.timeRateProperty.value);
  }
}
