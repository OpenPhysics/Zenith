/**
 * ZenithPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to ZenithPreferencesModel Properties (whose initial values come from
 * zenithQueryParameters). These overlays outlive Reset All.
 */

import type { BooleanProperty } from "scenerystack/axon";
import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import { LIGHT_SURFACE_TEXT_FILL } from "../common/SimButtonOptions.js";
import { StringManager } from "../i18n/StringManager.js";
import ZenithColors from "../ZenithColors.js";
import ZenithNamespace from "../ZenithNamespace.js";
import type { ZenithPreferencesModel } from "./ZenithPreferencesModel.js";

export class ZenithPreferencesNode extends VBox {
  public constructor(preferencesModel: ZenithPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: LIGHT_SURFACE_TEXT_FILL,
    });

    const checkbox = (
      property: BooleanProperty,
      labelProperty: typeof prefStrings.showStarLabelsStringProperty,
      tandemName: string,
    ): Checkbox =>
      new Checkbox(
        property,
        new Text(labelProperty, {
          font: new PhetFont(14),
          fill: LIGHT_SURFACE_TEXT_FILL,
          maxWidth: 280,
        }),
        {
          checkboxColor: LIGHT_SURFACE_TEXT_FILL,
          checkboxColorBackground: ZenithColors.controlSurfaceColorProperty,
          spacing: 8,
          ...(tandem && { tandem: tandem.createTandem(tandemName) }),
        },
      );

    super({
      align: "left",
      spacing: 12,
      children: [
        header,
        checkbox(
          preferencesModel.showStarLabelsProperty,
          prefStrings.showStarLabelsStringProperty,
          "showStarLabelsCheckbox",
        ),
        checkbox(
          preferencesModel.showConstellationsProperty,
          prefStrings.showConstellationsStringProperty,
          "showConstellationsCheckbox",
        ),
        checkbox(
          preferencesModel.showPlanetLabelsProperty,
          prefStrings.showPlanetLabelsStringProperty,
          "showPlanetLabelsCheckbox",
        ),
      ],
    });
  }
}

ZenithNamespace.register("ZenithPreferencesNode", ZenithPreferencesNode);
