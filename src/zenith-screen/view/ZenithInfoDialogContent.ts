/**
 * ZenithInfoDialogContent.ts
 *
 * Content for the "info" dialog opened from the info button next to Reset All.
 * Unlike the keyboard-help dialog, this is plain prose that explains how to use
 * the simulation (set location and time, look around, zoom, search, display
 * options) — not a list of keyboard shortcuts.
 *
 * The dialog renders on a light Panel background, so all text uses
 * LIGHT_SURFACE_TEXT_FILL (dark-on-light) to stay readable in both themes.
 */

import { RichText, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { LIGHT_SURFACE_TEXT_FILL } from "../../common/ZenithButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CONTROL_FONT_SIZE } from "../../ZenithConstants.js";

/** Wraps body text at a comfortable reading width for the dialog. */
const CONTENT_MAX_WIDTH = 460;

export class ZenithInfoDialogContent extends VBox {
  public constructor() {
    const info = StringManager.getInstance().getInfoStrings();
    const font = new PhetFont(CONTROL_FONT_SIZE);

    const line = (stringProperty: (typeof info)["introStringProperty"]) =>
      new RichText(stringProperty, {
        font: font,
        fill: LIGHT_SURFACE_TEXT_FILL,
        lineWrap: CONTENT_MAX_WIDTH,
      });

    super({
      align: "left",
      spacing: 10,
      maxWidth: CONTENT_MAX_WIDTH,
      children: [
        line(info.introStringProperty),
        line(info.locationTipStringProperty),
        line(info.timeTipStringProperty),
        line(info.lookTipStringProperty),
        line(info.zoomTipStringProperty),
        line(info.searchTipStringProperty),
        line(info.displayTipStringProperty),
      ],
    });
  }
}
