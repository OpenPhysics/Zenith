/**
 * ZenithScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * For multi-screen simulations, duplicate this file (e.g. IntroScreen.ts,
 * LabScreen.ts) and add each screen to the screens array in src/main.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import ZenithColors from "../ZenithColors.js";
import { ZenithModel } from "./model/ZenithModel.js";
import { ZenithKeyboardHelpContent } from "./view/ZenithKeyboardHelpContent.js";
import { ZenithScreenView } from "./view/ZenithScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type ZenithScreenOptions = ScreenOptions & { tandem: Tandem };

export class ZenithScreen extends Screen<ZenithModel, ZenithScreenView> {
  public constructor(options: ZenithScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new ZenithModel(),
      // View factory — receives the model instance
      (model) =>
        new ZenithScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ZenithScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: ZenithColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ZenithKeyboardHelpContent(),
        },
        options,
      ),
    );
  }
}
