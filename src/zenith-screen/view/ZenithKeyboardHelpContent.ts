/**
 * ZenithKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 * Planetarium rows come from ZenithHotkeyData so icons stay in sync with
 * attachPlanetariumInteraction. Scroll-wheel FOV is documented here too
 * (pointer gesture paired with keyboard look control).
 */

import {
  ArrowKeyNode,
  BasicActionsKeyboardHelpSection,
  KeyboardHelpIconFactory,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  SliderControlsKeyboardHelpSection,
  TextKeyNode,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import ZenithHotkeyData from "../../common/ZenithHotkeyData.js";
import { StringManager } from "../../i18n/StringManager.js";

/**
 * SceneryStack's KeyboardHelpIconFactory.fromHotkeyData has no `ctrl` entry in
 * ENGLISH_KEY_TO_KEY_NODE (only shift/alt), so Ctrl+arrow hotkeys need a hand-built icon.
 */
function ctrlLeftRightArrowIcon() {
  const ctrlKey = () => new TextKeyNode("Ctrl");
  return KeyboardHelpIconFactory.iconOrIcon(
    KeyboardHelpIconFactory.iconPlusIcon(ctrlKey(), new ArrowKeyNode("left")),
    KeyboardHelpIconFactory.iconPlusIcon(ctrlKey(), new ArrowKeyNode("right")),
  );
}

export class ZenithKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const kb = StringManager.getInstance().getKeyboardHelpStrings();

    const planetariumSection = new KeyboardHelpSection(kb.planetariumStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.LOOK_PAN, {
        labelStringProperty: kb.lookPanStringProperty,
        pdomLabelStringProperty: kb.lookPanDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.ADVANCE_CIVIL_TIME, {
        labelStringProperty: kb.advanceCivilTimeStringProperty,
        pdomLabelStringProperty: kb.advanceCivilTimeDescriptionStringProperty,
        icon: ctrlLeftRightArrowIcon(),
      }),
      KeyboardHelpSectionRow.labelWithIcon(kb.changeFieldOfViewStringProperty, new TextKeyNode("Scroll"), {
        labelInnerContent: kb.changeFieldOfViewDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.SELECT_NEXT, {
        labelStringProperty: kb.selectNextStringProperty,
        pdomLabelStringProperty: kb.selectNextDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.SELECT_PREVIOUS, {
        labelStringProperty: kb.selectPreviousStringProperty,
        pdomLabelStringProperty: kb.selectPreviousDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(ZenithHotkeyData.CLEAR_SELECTION, {
        labelStringProperty: kb.clearSelectionStringProperty,
        pdomLabelStringProperty: kb.clearSelectionDescriptionStringProperty,
      }),
    ]);

    super(
      [planetariumSection, new SliderControlsKeyboardHelpSection(), new TimeControlsKeyboardHelpSection()],
      [new BasicActionsKeyboardHelpSection()],
    );
  }
}
