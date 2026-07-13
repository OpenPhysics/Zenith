/**
 * ZenithPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to ZenithPreferencesModel Properties (whose initial values come from
 * zenithQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import { StringManager } from "../i18n/StringManager.js";
import ZenithColors from "../ZenithColors.js";
import ZenithNamespace from "../ZenithNamespace.js";
import type { ZenithPreferencesModel } from "./ZenithPreferencesModel.js";

export class ZenithPreferencesNode extends VBox {
  public constructor(preferencesModel: ZenithPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: ZenithColors.textColorProperty,
    });

    const exampleToggleCheckbox = new Checkbox(
      preferencesModel.exampleToggleProperty,
      new Text(prefStrings.exampleToggleStringProperty, {
        font: new PhetFont(14),
        fill: ZenithColors.textColorProperty,
      }),
      {
        checkboxColor: ZenithColors.textColorProperty,
        checkboxColorBackground: ZenithColors.panelBackgroundColorProperty,
        spacing: 8,
        ...(tandem && { tandem: tandem.createTandem("exampleToggleCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, exampleToggleCheckbox],
    });
  }
}

ZenithNamespace.register("ZenithPreferencesNode", ZenithPreferencesNode);
