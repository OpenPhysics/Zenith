/**
 * SelectedObjectReadout.ts
 *
 * Compact control-panel readout for the currently selected named star or planet:
 * name, magnitude, equatorial, and horizontal coordinates.
 */

import { DerivedProperty, Multilink, PatternStringProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { allPlanetEquatorialStates, type PlanetBodyId } from "../../common/sky/PlanetEphemeris.js";
import { equatorialToHorizontal } from "../../common/sky/SkyCoordinates.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CONTROL_FONT_SIZE, CONTROL_PANEL_WIDTH } from "../../SimConstants.js";
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
  selected: SelectedSkyObject | null,
  civilMs: number,
  lat: number,
  lon: number,
  lst: number,
): SelectionCoords => {
  if (!selected) {
    return { kind: "none", mag: 0, raHours: 0, decDeg: 0, altDeg: 0, azDeg: 0 };
  }
  if (selected.kind === "star") {
    const { altDeg, azDeg } = equatorialToHorizontal(selected.raHours, selected.decDeg, lat, lst);
    return {
      kind: "star",
      mag: selected.mag,
      raHours: selected.raHours,
      decDeg: selected.decDeg,
      altDeg,
      azDeg,
    };
  }
  const entry = allPlanetEquatorialStates(civilMs, lat, lon).find((s) => s.bodyId === selected.id);
  if (!entry) {
    return { kind: "none", mag: 0, raHours: 0, decDeg: 0, altDeg: 0, azDeg: 0 };
  }
  const { altDeg, azDeg } = equatorialToHorizontal(entry.state.raHours, entry.state.decDeg, lat, lst);
  return {
    kind: "planet",
    mag: entry.state.mag,
    raHours: entry.state.raHours,
    decDeg: entry.state.decDeg,
    altDeg,
    azDeg,
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
        model.civilTimeMsProperty,
        model.latitudeProperty,
        model.longitudeProperty,
        model.localSiderealTimeHoursProperty,
      ],
      (selected, civilMs, lat, lon, lst) => buildCoords(selected, civilMs, lat, lon, lst),
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
        children: [noneText, nameText, magText, eqText, hzText],
      }),
    );
  }
}
