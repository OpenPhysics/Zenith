/**
 * ZenithScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers (SceneryStack's
 * Interactive Description). It appears at the top of the parallel DOM and gives
 * a non-visual user a way to orient themselves and to re-read the simulation's
 * current state at any time.
 *
 * A summary has four regions (all optional, but provide at least the first
 * three in every sim for consistency across OpenPhysics):
 *   - playAreaContent       — what the play area contains
 *   - controlAreaContent    — what the controls do
 *   - currentDetailsContent — a LIVE paragraph describing current state
 *   - interactionHintContent — a short hint on how to get started
 *
 * ── Making "current details" live ─────────────────────────────────────────────
 * Build a DerivedProperty over latitude, longitude, and local sidereal time
 * and pass it as `currentDetailsContent` so the paragraph updates as the sky
 * runs. See LunarLander/src/.../LunarLanderScreenSummaryContent.ts for the pattern.
 */
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ZenithModel } from "../model/ZenithModel.js";

export class ZenithScreenSummaryContent extends ScreenSummaryContent {
  // Keep `model` in the signature so live currentDetailsContent can use it later.
  public constructor(_model: ZenithModel) {
    const a11y = StringManager.getInstance().getA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
