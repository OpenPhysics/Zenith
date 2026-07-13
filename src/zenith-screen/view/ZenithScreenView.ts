/**
 * ZenithScreenView.ts
 *
 * Root view for the planetarium screen. Hosts the sky / dome renderer and
 * observer controls. Follow these conventions:
 *   - Use this.layoutBounds for positioning (never magic pixel values)
 *   - Keep a ResetAllButton that calls model.reset() and this.reset()
 *   - Override step(dt) to advance the model each frame
 *
 * ── Planetarium renderer ──────────────────────────────────────────────────────
 * Replace the placeholder with a SceneryStack Node (or Canvas/WebGL-backed
 * Path) that projects the celestial sphere for the observer in ZenithModel:
 * latitude, longitude, and local sidereal time.
 */

import { Node, Rectangle, Text } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import { SCREEN_VIEW_MARGIN } from "../../SimConstants.js";
import ZenithColors from "../../ZenithColors.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import { ZenithScreenSummaryContent } from "./ZenithScreenSummaryContent.js";

export class ZenithScreenView extends ScreenView {
  private readonly model: ZenithModel;

  public constructor(model: ZenithModel, options?: ScreenViewOptions) {
    // ── Accessibility: screen summary ───────────────────────────────────────────
    // The screen summary is the first thing a screen-reader user encounters. It
    // is registered here, in the ScreenView's super() options, so every sim wires
    // it the same way. See ZenithScreenSummaryContent for the four content regions.
    super({
      screenSummaryContent: new ZenithScreenSummaryContent(model),
      ...options,
    });

    this.model = model;

    // ── Background ────────────────────────────────────────────────────────────
    // Night-sky fill that follows the active color profile.
    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: ZenithColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // ── Placeholder until the planetarium renderer Node lands ─────────────────
    const titleStringProperty = StringManager.getInstance().getTitleStringProperty();
    const placeholderText = new Text(titleStringProperty, {
      font: "bold 36px sans-serif",
      fill: ZenithColors.textColorProperty,
      center: this.layoutBounds.center,
    });
    this.addChild(placeholderText);

    // ── Reset All button ──────────────────────────────────────────────────────
    // Always position at bottom-right (PhET convention).
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    // ── Accessibility: keyboard / reading traversal order ───────────────────────
    // Make the parallel DOM (Tab order and screen-reader reading order)
    // deterministic and independent of child z-order. ScreenView throws if you
    // set pdomOrder on itself, so add a lightweight wrapper Node that "borrows"
    // the interactive nodes in the order a user should reach them — Reset All
    // last. Non-interactive decoration (background, placeholder) is omitted.
    this.addChild(
      new Node({
        pdomOrder: [
          // TODO: add planetarium controls here, in traversal order
          resetAllButton,
        ],
      }),
    );
  }

  /**
   * Resets view-side state (animations, panel visibility, etc.).
   * Called by the Reset All button listener.
   */
  public reset(): void {
    // TODO: reset any view-side planetarium state here
  }

  /**
   * Steps the view forward by dt seconds for animation.
   * @param dt - elapsed time in seconds
   */
  public override step(dt: number): void {
    this.model.step(dt);
  }
}
