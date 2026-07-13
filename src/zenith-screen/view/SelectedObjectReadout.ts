/**
 * SelectedObjectReadout.ts
 *
 * Compact control-panel readout for the currently selected named star or planet:
 * name, magnitude, equatorial, and horizontal coordinates.
 */

import { DerivedProperty, Multilink, PatternStringProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import type { PlanetBodyId } from "../../common/sky/PlanetEphemeris.js";
import { equatorialToHorizontal, riseSetInfo, solarHoursUntilLst } from "../../common/sky/SkyCoordinates.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CONTROL_FONT_SIZE, CONTROL_PANEL_WIDTH, SIDEREAL_HOURS_PER_SOLAR_HOUR } from "../../SimConstants.js";
import ZenithColors from "../../ZenithColors.js";
import type { SelectedSkyObject } from "../model/SelectedSkyObject.js";
import type { ZenithModel } from "../model/ZenithModel.js";

const formatHours = (hours: number): string => hours.toFixed(2);
const formatDeg = (deg: number): string => deg.toFixed(1);
const formatMag = (mag: number): string => mag.toFixed(2);

type SelectionCoords = {
  kind: "star" | "planet" | "none";
  mag: number;
  raHours: number;
  decDeg: number;
  altDeg: number;
  azDeg: number;
};

const resolvePlanetName = (
  id: PlanetBodyId,
  bodies: ReturnType<StringManager["getBodies"]>,
): TReadOnlyProperty<string> => {
  switch (id) {
    case "sun":
      return bodies.sunStringProperty;
    case "moon":
      return bodies.moonStringProperty;
    case "mercury":
      return bodies.mercuryStringProperty;
    case "venus":
      return bodies.venusStringProperty;
    case "mars":
      return bodies.marsStringProperty;
    case "jupiter":
      return bodies.jupiterStringProperty;
    case "saturn":
      return bodies.saturnStringProperty;
    case "uranus":
      return bodies.uranusStringProperty;
    case "neptune":
      return bodies.neptuneStringProperty;
  }
};

const resolveStarName = (id: string, stars: ReturnType<StringManager["getStars"]>): TReadOnlyProperty<string> => {
  const key = `${id}StringProperty` as keyof typeof stars;
  return stars[key] as TReadOnlyProperty<string>;
};

const objectName = (
  selected: SelectedSkyObject | null,
  bodies: ReturnType<StringManager["getBodies"]>,
  stars: ReturnType<StringManager["getStars"]>,
  noneLabel: string,
): string => {
  if (!selected) {
    return noneLabel;
  }
  if (selected.kind === "star") {
    return resolveStarName(selected.id, stars).value;
  }
  return resolvePlanetName(selected.id, bodies).value;
};

const buildCoords = (
  model: ZenithModel,
  selected: SelectedSkyObject | null,
  lat: number,
  lst: number,
): SelectionCoords => {
  if (!selected) {
    return { kind: "none", mag: 0, raHours: 0, decDeg: 0, altDeg: 0, azDeg: 0 };
  }
  const eq = model.equatorialOfSelected(selected);
  if (!eq) {
    return { kind: "none", mag: 0, raHours: 0, decDeg: 0, altDeg: 0, azDeg: 0 };
  }
  const { altDeg, azDeg } = equatorialToHorizontal(eq.raHours, eq.decDeg, lat, lst);
  return {
    kind: selected.kind,
    mag: eq.mag,
    raHours: eq.raHours,
    decDeg: eq.decDeg,
    altDeg,
    azDeg,
  };
};

/** Formats a positive duration in hours as "Hh Mm" (or "Mm" under an hour). */
const formatDuration = (hours: number): string => {
  const totalMin = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

type Visibility = {
  kind: "none" | "risesSets" | "circumpolar" | "neverRises";
  riseInHours: number;
  riseAzDeg: number;
  setInHours: number;
  setAzDeg: number;
  transitInHours: number;
  transitAltDeg: number;
};

const NO_VISIBILITY: Visibility = {
  kind: "none",
  riseInHours: 0,
  riseAzDeg: 0,
  setInHours: 0,
  setAzDeg: 0,
  transitInHours: 0,
  transitAltDeg: 0,
};

/** When each event next happens for the selected object, relative to the current LST. */
const buildVisibility = (
  model: ZenithModel,
  selected: SelectedSkyObject | null,
  lat: number,
  lst: number,
): Visibility => {
  if (!selected) {
    return NO_VISIBILITY;
  }
  const eq = model.equatorialOfSelected(selected);
  if (!eq) {
    return NO_VISIBILITY;
  }
  const info = riseSetInfo(eq.raHours, eq.decDeg, lat);
  const transitInHours = solarHoursUntilLst(lst, info.transitLstHours, SIDEREAL_HOURS_PER_SOLAR_HOUR);
  if (info.band === "neverRises") {
    return { ...NO_VISIBILITY, kind: "neverRises" };
  }
  if (info.band === "circumpolar" || info.riseLstHours === null || info.setLstHours === null) {
    return { ...NO_VISIBILITY, kind: "circumpolar", transitInHours, transitAltDeg: info.transitAltitudeDeg };
  }
  return {
    kind: "risesSets",
    riseInHours: solarHoursUntilLst(lst, info.riseLstHours, SIDEREAL_HOURS_PER_SOLAR_HOUR),
    riseAzDeg: info.riseAzimuthDeg ?? 0,
    setInHours: solarHoursUntilLst(lst, info.setLstHours, SIDEREAL_HOURS_PER_SOLAR_HOUR),
    setAzDeg: info.setAzimuthDeg ?? 0,
    transitInHours,
    transitAltDeg: info.transitAltitudeDeg,
  };
};

export class SelectedObjectReadout extends Node {
  public constructor(model: ZenithModel) {
    super();

    const stringManager = StringManager.getInstance();
    const controls = stringManager.getControls();
    const bodies = stringManager.getBodies();
    const stars = stringManager.getStars();
    const labelFont = new PhetFont(CONTROL_FONT_SIZE);
    const maxWidth = CONTROL_PANEL_WIDTH - 40;

    const nameProperty = new Property(
      objectName(model.selectedObjectProperty.value, bodies, stars, controls.selectedNoneStringProperty.value),
    );
    Multilink.multilink([model.selectedObjectProperty, controls.selectedNoneStringProperty], (selected, noneLabel) => {
      nameProperty.value = objectName(selected, bodies, stars, noneLabel);
    });

    const coordsProperty = new DerivedProperty(
      [
        model.selectedObjectProperty,
        model.skySnapshotProperty,
        model.latitudeProperty,
        model.localSiderealTimeHoursProperty,
      ],
      (selected, _snapshot, lat, lst) => buildCoords(model, selected, lat, lst),
    );

    const magProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatMag(s.mag)));
    const raProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatHours(s.raHours)));
    const decProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatDeg(s.decDeg)));
    const altProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatDeg(s.altDeg)));
    const azProperty = new DerivedProperty([coordsProperty], (s) => (s.kind === "none" ? "—" : formatDeg(s.azDeg)));

    const nameText = new Text(
      new PatternStringProperty(controls.selectedObjectStringProperty, { name: nameProperty }),
      { font: labelFont, fill: ZenithColors.accentColorProperty, maxWidth },
    );
    const noneText = new Text(controls.selectedNoneStringProperty, {
      font: labelFont,
      fill: ZenithColors.textColorProperty,
      maxWidth,
    });
    const magText = new Text(new PatternStringProperty(controls.selectedMagStringProperty, { mag: magProperty }), {
      font: labelFont,
      fill: ZenithColors.textColorProperty,
      maxWidth,
    });
    const eqText = new Text(
      new PatternStringProperty(controls.selectedEquatorialStringProperty, {
        ra: raProperty,
        dec: decProperty,
      }),
      { font: labelFont, fill: ZenithColors.textColorProperty, maxWidth },
    );
    const hzText = new Text(
      new PatternStringProperty(controls.selectedHorizontalStringProperty, {
        alt: altProperty,
        az: azProperty,
      }),
      { font: labelFont, fill: ZenithColors.textColorProperty, maxWidth },
    );

    // ── Rise / set / transit (event times relative to now, at the sidereal rate) ──
    const visibilityProperty = new DerivedProperty(
      [
        model.selectedObjectProperty,
        model.skySnapshotProperty,
        model.latitudeProperty,
        model.localSiderealTimeHoursProperty,
      ],
      (selected, _snapshot, lat, lst) => buildVisibility(model, selected, lat, lst),
    );

    const riseTimeProperty = new DerivedProperty([visibilityProperty], (v) => formatDuration(v.riseInHours));
    const riseAzProperty = new DerivedProperty([visibilityProperty], (v) => formatDeg(v.riseAzDeg));
    const setTimeProperty = new DerivedProperty([visibilityProperty], (v) => formatDuration(v.setInHours));
    const setAzProperty = new DerivedProperty([visibilityProperty], (v) => formatDeg(v.setAzDeg));
    const transitTimeProperty = new DerivedProperty([visibilityProperty], (v) => formatDuration(v.transitInHours));
    const transitAltProperty = new DerivedProperty([visibilityProperty], (v) => formatDeg(v.transitAltDeg));

    const eventTextOptions = { font: labelFont, fill: ZenithColors.textColorProperty, maxWidth };
    const riseText = new Text(
      new PatternStringProperty(controls.selectedRiseStringProperty, { time: riseTimeProperty, az: riseAzProperty }),
      eventTextOptions,
    );
    const setText = new Text(
      new PatternStringProperty(controls.selectedSetStringProperty, { time: setTimeProperty, az: setAzProperty }),
      eventTextOptions,
    );
    const transitText = new Text(
      new PatternStringProperty(controls.selectedTransitStringProperty, {
        time: transitTimeProperty,
        alt: transitAltProperty,
      }),
      eventTextOptions,
    );
    const circumpolarText = new Text(controls.selectedCircumpolarStringProperty, eventTextOptions);
    const neverRisesText = new Text(controls.selectedNeverRisesStringProperty, eventTextOptions);

    visibilityProperty.link((v) => {
      riseText.visible = v.kind === "risesSets";
      setText.visible = v.kind === "risesSets";
      transitText.visible = v.kind === "risesSets" || v.kind === "circumpolar";
      circumpolarText.visible = v.kind === "circumpolar";
      neverRisesText.visible = v.kind === "neverRises";
    });

    coordsProperty.link((coords) => {
      const hasSelection = coords.kind !== "none";
      noneText.visible = !hasSelection;
      nameText.visible = hasSelection;
      magText.visible = hasSelection;
      eqText.visible = hasSelection;
      hzText.visible = hasSelection;
    });

    this.addChild(
      new VBox({
        spacing: 2,
        align: "left",
        children: [
          noneText,
          nameText,
          magText,
          eqText,
          hzText,
          transitText,
          riseText,
          setText,
          circumpolarText,
          neverRisesText,
        ],
      }),
    );
  }
}
