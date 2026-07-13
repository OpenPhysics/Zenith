/**
 * ZenithModel.ts
 *
 * Top-level model for the planetarium screen. Civil time drives ephemerides and
 * local sidereal time (via astronomy-engine GAST + longitude). Look / FOV state
 * is first-person camera; the view only observes these Properties.
 */
import {
  BooleanProperty,
  DerivedProperty,
  EnumerationProperty,
  NumberProperty,
  Property,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { TimeSpeed } from "scenerystack/scenery-phet";
import {
  allPlanetEquatorialStates,
  localSiderealTimeHours,
  type MoonPhaseState,
  moonPhaseState,
  type PlanetBodyId,
  type PlanetEquatorialState,
} from "../../common/sky/PlanetEphemeris.js";
import { type EquatorialCoordinates, equatorialToHorizontal } from "../../common/sky/SkyCoordinates.js";
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
  DEFAULT_SHOW_EQUATORIAL_GRID,
  DEFAULT_SHOW_MERIDIAN,
  DEFAULT_SHOW_PLANETS,
  DEFAULT_TRUE_SCALE_BODIES,
  FIELD_OF_VIEW_RANGE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  LOOK_ALTITUDE_RANGE,
  MAGNITUDE_LIMIT_RANGE,
  SIDEREAL_HOURS_PER_SOLAR_HOUR,
} from "../../SimConstants.js";
import { DEFAULT_EPOCH_PRESET, EPOCH_PRESET_CIVIL_MS, EpochPreset } from "./EpochPreset.js";
import { DEFAULT_LOCATION_PRESET, LOCATION_PRESET_COORDS, LocationPreset } from "./LocationPreset.js";
import type { SelectedSkyObject } from "./SelectedSkyObject.js";

const SPEED_MULTIPLIERS = new Map<TimeSpeed, number>([
  [TimeSpeed.SLOW, 0.25],
  [TimeSpeed.NORMAL, 1],
  [TimeSpeed.FAST, 4],
]);

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

  /** Discrete animation speed for TimeControlNode (SLOW / NORMAL / FAST). */
  public readonly timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL);

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

  /** Hide stars fainter than this visual magnitude. */
  public readonly magnitudeLimitProperty: NumberProperty;

  /** Currently selected sky object, or null when nothing is selected. */
  public readonly selectedObjectProperty: Property<SelectedSkyObject | null>;

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
    this.showHorizonProperty = new BooleanProperty(true);
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
  }

  /** Combined multiplier from the discrete TimeSpeed radio. */
  private get speedMultiplier(): number {
    return SPEED_MULTIPLIERS.get(this.timeSpeedProperty.value) ?? 1;
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

  /** One step-forward press for TimeControlNode. */
  public stepForward(): void {
    this.advanceCivilTimeHours(this.speedMultiplier * CIVIL_HOURS_PER_SIM_SECOND);
  }

  public clearSelection(): void {
    this.selectedObjectProperty.value = null;
  }

  public reset(): void {
    this.timer.reset();
    this.timeSpeedProperty.reset();
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
    this.showHorizonProperty.reset();
    this.showAtmosphereProperty.reset();
    this.showPlanetsProperty.reset();
    this.trueScaleBodiesProperty.reset();
    // Preference-backed overlays (star names, constellations, planet labels) are
    // not reset — they outlive Reset All.
    this.magnitudeLimitProperty.reset();
    this.selectedObjectProperty.reset();
  }

  public step(dt: number): void {
    this.timer.step(dt);
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.advanceCivilTimeHours(dt * CIVIL_HOURS_PER_SIM_SECOND * this.speedMultiplier);
  }
}
