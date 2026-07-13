/**
 * ZenithControlOptions.ts
 *
 * Shared sizing and layout for panel controls (sliders, checkboxes, NumberControls).
 */

import { NumberControl } from "scenerystack/scenery-phet";
import type { CheckboxOptions } from "scenerystack/sun";
import { CHECKBOX_BOX_WIDTH, NUMBER_CONTROL_SLIDER_TRACK_SIZE, SLIDER_THUMB_SIZE } from "../SimConstants.js";
import ZenithColors from "../ZenithColors.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "./SimButtonOptions.js";

/** Base NumberControl options; spread into each instance and add titleNodeOptions as needed. */
export const ZENITH_NUMBER_CONTROL_OPTIONS = {
  arrowButtonOptions: { ...FLAT_RECTANGULAR_BUTTON_OPTIONS, scale: 0.75 },
  layoutFunction: NumberControl.createLayoutFunction4({
    sliderPadding: 4,
    arrowButtonSpacing: 3,
    verticalSpacing: 4,
  }),
  sliderOptions: {
    trackSize: NUMBER_CONTROL_SLIDER_TRACK_SIZE,
    thumbSize: SLIDER_THUMB_SIZE,
    trackFillEnabled: ZenithColors.textColorProperty,
  },
};

/** Themed checkbox chrome for dark panel backgrounds. */
export const ZENITH_CHECKBOX_OPTIONS = {
  boxWidth: CHECKBOX_BOX_WIDTH,
  spacing: 4,
  checkboxColor: ZenithColors.textColorProperty,
  checkboxColorBackground: ZenithColors.panelBackgroundColorProperty,
} satisfies CheckboxOptions;
