/**
 * ZenithModel.ts
 *
 * Top-level model for the planetarium screen. Holds observer location and the
 * simulation clock that drives sky motion. The view (planetarium renderer)
 * projects the celestial sphere for this observer; it must not mutate these
 * Properties — only observe them.
 *
 * ── Step cycle ────────────────────────────────────────────────────────────────
 * The Sim calls step(dt) on every animation frame. When the timer is playing,
 * elapsed time and local sidereal time advance together.
 *
 * ── Reset ─────────────────────────────────────────────────────────────────────
 * reset() is called when the user presses Reset All. Call .reset() on every
 * Property declared here.
 */
import { NumberProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { TimeModel } from "../../common/TimeModel.js";
import {
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LOCAL_SIDEREAL_TIME_HOURS,
  DEFAULT_LONGITUDE_DEG,
  HOURS_PER_SIDEREAL_DAY,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  SIDEREAL_HOURS_PER_SIM_SECOND,
} from "../../SimConstants.js";

export class ZenithModel implements TModel {
  /** Play/pause + elapsed simulation time for sky animation. Starts playing. */
  public readonly timer = new TimeModel(true);

  /** Observer geographic latitude in degrees (+N). */
  public readonly latitudeProperty: NumberProperty;

  /** Observer geographic longitude in degrees (+E). */
  public readonly longitudeProperty: NumberProperty;

  /**
   * Local sidereal time in hours, wrapped to [0, 24).
   * Advances with the simulation clock while playing.
   */
  public readonly localSiderealTimeHoursProperty: NumberProperty;

  public constructor() {
    this.latitudeProperty = new NumberProperty(DEFAULT_LATITUDE_DEG, {
      range: LATITUDE_RANGE,
    });
    this.longitudeProperty = new NumberProperty(DEFAULT_LONGITUDE_DEG, {
      range: LONGITUDE_RANGE,
    });
    this.localSiderealTimeHoursProperty = new NumberProperty(DEFAULT_LOCAL_SIDEREAL_TIME_HOURS);
  }

  /**
   * Resets all model state to initial values.
   * Called when the user presses the Reset All button.
   */
  public reset(): void {
    this.timer.reset();
    this.latitudeProperty.reset();
    this.longitudeProperty.reset();
    this.localSiderealTimeHoursProperty.reset();
  }

  /**
   * Steps the model forward by dt seconds.
   * Called every animation frame by the Sim framework.
   *
   * @param dt - elapsed time in seconds since the last frame
   */
  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }

    this.timer.step(dt);

    const nextLst = this.localSiderealTimeHoursProperty.value + dt * SIDEREAL_HOURS_PER_SIM_SECOND;
    this.localSiderealTimeHoursProperty.value =
      ((nextLst % HOURS_PER_SIDEREAL_DAY) + HOURS_PER_SIDEREAL_DAY) % HOURS_PER_SIDEREAL_DAY;
  }
}
