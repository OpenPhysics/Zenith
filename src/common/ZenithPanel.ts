/**
 * ZenithPanel.ts
 *
 * A pre-themed Panel that automatically uses ZenithColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { ZenithPanel } from "../../common/ZenithPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new ZenithPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new ZenithPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new ZenithPanel(content, { fill: "transparent" });
 */

import type { Node } from "scenerystack/scenery";
import type { PanelOptions } from "scenerystack/sun";
import { Panel } from "scenerystack/sun";
import ZenithColors from "../ZenithColors.js";
import { PANEL_CORNER_RADIUS } from "../ZenithConstants.js";

export class ZenithPanel extends Panel {
  public constructor(content: Node, providedOptions?: PanelOptions) {
    super(content, {
      fill: ZenithColors.panelBackgroundColorProperty,
      stroke: ZenithColors.panelBorderColorProperty,
      cornerRadius: PANEL_CORNER_RADIUS,
      xMargin: 12,
      yMargin: 10,
      ...providedOptions,
    });
  }
}
