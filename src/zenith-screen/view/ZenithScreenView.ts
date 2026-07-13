/**
 * ZenithScreenView.ts
 *
 * Root view for the planetarium screen. Hosts the first-person sky FOV and
 * observer / time / display controls.
 */

import { BooleanProperty, DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import { GridBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { AccordionBox, Checkbox, ComboBox } from "scenerystack/sun";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  SIM_COMBO_BOX_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { ZENITH_CHECKBOX_OPTIONS, ZENITH_NUMBER_CONTROL_OPTIONS } from "../../common/ZenithControlOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import {
  CONTROL_FONT_SIZE,
  CONTROL_PANEL_WIDTH,
  FIELD_OF_VIEW_RANGE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  MAGNITUDE_LIMIT_RANGE,
  PANEL_CONTENT_SPACING,
  PANEL_CORNER_RADIUS,
  PANEL_TITLE_FONT_SIZE,
  PANEL_X_MARGIN,
  PANEL_Y_MARGIN,
  SCREEN_VIEW_MARGIN,
} from "../../SimConstants.js";
import ZenithColors from "../../ZenithColors.js";
import { EpochPreset } from "../model/EpochPreset.js";
import { LocationPreset } from "../model/LocationPreset.js";
import type { ZenithModel } from "../model/ZenithModel.js";
import { attachPlanetariumInteraction } from "./attachPlanetariumInteraction.js";
import { PlanetariumSkyNode } from "./PlanetariumSkyNode.js";
import { SelectedObjectReadout } from "./SelectedObjectReadout.js";
import { ZenithScreenSummaryContent } from "./ZenithScreenSummaryContent.js";

/** Formats civil time for the control-panel readout (UTC, minute precision). */
const formatCivilTimeUtc = (civilTimeMs: number): string =>
  new Date(civilTimeMs).toISOString().replace("T", " ").slice(0, 16);

/** Gap between the control panel and Reset All when they would overlap. */
const RESET_ALL_PANEL_GAP = 8;

/** Inset of the selection readout from the play-area edges. */
const SELECTION_PANEL_INSET = 8;

export class ZenithScreenView extends ScreenView {
  private readonly model: ZenithModel;
  private readonly skyNode: PlanetariumSkyNode;
  private readonly controlPanel: AccordionBox;

  public constructor(model: ZenithModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new ZenithScreenSummaryContent(model),
      ...options,
    });

    this.model = model;

    const stringManager = StringManager.getInstance();
    const controls = stringManager.getControls();
    const locations = stringManager.getLocations();
    const epochs = stringManager.getEpochs();
    const a11y = stringManager.getA11yStrings();

    // ── Background ────────────────────────────────────────────────────────────
    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: ZenithColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // ── Control panel (built first so the play area can fill the remainder) ───
    const labelFont = new PhetFont(CONTROL_FONT_SIZE);
    const titleOptions = {
      font: labelFont,
      fill: ZenithColors.textColorProperty,
      maxWidth: CONTROL_PANEL_WIDTH - 40,
    };
    const comboItemFont = new PhetFont(CONTROL_FONT_SIZE);
    const comboItem = (labelProperty: typeof locations.boulderStringProperty) => ({
      createNode: () =>
        new Text(labelProperty, {
          font: comboItemFont,
          fill: LIGHT_SURFACE_TEXT_FILL,
          maxWidth: CONTROL_PANEL_WIDTH - 50,
        }),
    });

    const locationLabel = new Text(controls.locationStringProperty, titleOptions);
    const locationCombo = new ComboBox(
      model.locationPresetProperty,
      [
        { value: LocationPreset.BOULDER, ...comboItem(locations.boulderStringProperty) },
        { value: LocationPreset.GREENWICH, ...comboItem(locations.greenwichStringProperty) },
        { value: LocationPreset.EQUATOR, ...comboItem(locations.equatorStringProperty) },
        { value: LocationPreset.NORTH_POLE, ...comboItem(locations.northPoleStringProperty) },
        { value: LocationPreset.SOUTH_POLE, ...comboItem(locations.southPoleStringProperty) },
        { value: LocationPreset.SYDNEY, ...comboItem(locations.sydneyStringProperty) },
        { value: LocationPreset.CUSTOM, ...comboItem(locations.customStringProperty) },
      ],
      this,
      {
        ...SIM_COMBO_BOX_OPTIONS,
        accessibleName: a11y.controls.locationStringProperty,
      },
    );

    const latitudeControl = new NumberControl(controls.latitudeStringProperty, model.latitudeProperty, LATITUDE_RANGE, {
      ...ZENITH_NUMBER_CONTROL_OPTIONS,
      delta: 1,
      numberDisplayOptions: {
        decimalPlaces: 0,
        valuePattern: "{{value}}°",
      },
      titleNodeOptions: titleOptions,
      accessibleName: a11y.controls.latitudeStringProperty,
    });

    const longitudeControl = new NumberControl(
      controls.longitudeStringProperty,
      model.longitudeProperty,
      LONGITUDE_RANGE,
      {
        ...ZENITH_NUMBER_CONTROL_OPTIONS,
        delta: 1,
        numberDisplayOptions: {
          decimalPlaces: 0,
          valuePattern: "{{value}}°",
        },
        titleNodeOptions: titleOptions,
        accessibleName: a11y.controls.longitudeStringProperty,
      },
    );

    const epochLabel = new Text(controls.epochStringProperty, titleOptions);
    const epochCombo = new ComboBox(
      model.epochPresetProperty,
      [
        { value: EpochPreset.DEFAULT, ...comboItem(epochs.defaultStringProperty) },
        { value: EpochPreset.MARCH_EQUINOX, ...comboItem(epochs.marchEquinoxStringProperty) },
        { value: EpochPreset.JUNE_SOLSTICE, ...comboItem(epochs.juneSolsticeStringProperty) },
        { value: EpochPreset.SEPTEMBER_EQUINOX, ...comboItem(epochs.septemberEquinoxStringProperty) },
        { value: EpochPreset.DECEMBER_SOLSTICE, ...comboItem(epochs.decemberSolsticeStringProperty) },
        { value: EpochPreset.CUSTOM, ...comboItem(epochs.customStringProperty) },
      ],
      this,
      {
        ...SIM_COMBO_BOX_OPTIONS,
        accessibleName: a11y.controls.epochStringProperty,
      },
    );

    const fovControl = new NumberControl(
      controls.fieldOfViewStringProperty,
      model.fieldOfViewDegProperty,
      FIELD_OF_VIEW_RANGE,
      {
        ...ZENITH_NUMBER_CONTROL_OPTIONS,
        delta: 5,
        numberDisplayOptions: {
          decimalPlaces: 0,
          valuePattern: "{{value}}°",
        },
        titleNodeOptions: titleOptions,
        accessibleName: a11y.controls.fieldOfViewStringProperty,
      },
    );

    const magnitudeControl = new NumberControl(
      controls.magnitudeLimitStringProperty,
      model.magnitudeLimitProperty,
      MAGNITUDE_LIMIT_RANGE,
      {
        ...ZENITH_NUMBER_CONTROL_OPTIONS,
        delta: 0.1,
        numberDisplayOptions: {
          decimalPlaces: 1,
        },
        titleNodeOptions: titleOptions,
        accessibleName: a11y.controls.magnitudeLimitStringProperty,
      },
    );

    const civilTimeUtcProperty = new DerivedProperty([model.civilTimeMsProperty], formatCivilTimeUtc);
    const civilTimeReadout = new Text(
      new PatternStringProperty(controls.civilTimeStringProperty, {
        time: civilTimeUtcProperty,
      }),
      {
        font: labelFont,
        fill: ZenithColors.textColorProperty,
        maxWidth: CONTROL_PANEL_WIDTH - 40,
      },
    );

    const lstReadout = new Text(
      new PatternStringProperty(
        controls.localSiderealTimeStringProperty,
        {
          hours: model.localSiderealTimeHoursProperty,
        },
        { decimalPlaces: { hours: 2 } },
      ),
      {
        font: labelFont,
        fill: ZenithColors.textColorProperty,
        maxWidth: CONTROL_PANEL_WIDTH - 40,
      },
    );

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timeSpeedProperty,
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.stepForward(),
        },
      },
    });

    const selectedReadout = new SelectedObjectReadout(model);

    const checkbox = (
      property: typeof model.showGridProperty,
      labelProperty: typeof controls.showGridStringProperty,
      accessibleName: typeof a11y.controls.showGridStringProperty,
    ): Checkbox =>
      new Checkbox(
        property,
        new Text(labelProperty, {
          font: labelFont,
          fill: ZenithColors.textColorProperty,
          maxWidth: CONTROL_PANEL_WIDTH / 2 - 30,
        }),
        {
          ...ZENITH_CHECKBOX_OPTIONS,
          accessibleName,
        },
      );

    const gridCheckbox = checkbox(
      model.showGridProperty,
      controls.showGridStringProperty,
      a11y.controls.showGridStringProperty,
    );
    const cardinalsCheckbox = checkbox(
      model.showCardinalsProperty,
      controls.showCardinalsStringProperty,
      a11y.controls.showCardinalsStringProperty,
    );
    const meridianCheckbox = checkbox(
      model.showMeridianProperty,
      controls.showMeridianStringProperty,
      a11y.controls.showMeridianStringProperty,
    );
    const equatorialGridCheckbox = checkbox(
      model.showEquatorialGridProperty,
      controls.showEquatorialGridStringProperty,
      a11y.controls.showEquatorialGridStringProperty,
    );
    const horizonCheckbox = checkbox(
      model.showHorizonProperty,
      controls.showHorizonStringProperty,
      a11y.controls.showHorizonStringProperty,
    );
    const atmosphereCheckbox = checkbox(
      model.showAtmosphereProperty,
      controls.showAtmosphereStringProperty,
      a11y.controls.showAtmosphereStringProperty,
    );
    const planetsCheckbox = checkbox(
      model.showPlanetsProperty,
      controls.showPlanetsStringProperty,
      a11y.controls.showPlanetsStringProperty,
    );

    // Star names, constellation lines, and planet labels live in Preferences → Simulation.
    const displayToggles = new GridBox({
      rows: [
        [gridCheckbox, cardinalsCheckbox],
        [meridianCheckbox, equatorialGridCheckbox],
        [horizonCheckbox, planetsCheckbox],
        [atmosphereCheckbox],
      ],
      xSpacing: 8,
      ySpacing: 4,
      xAlign: "left",
      yAlign: "center",
    });

    const panelContent = new VBox({
      spacing: PANEL_CONTENT_SPACING,
      align: "left",
      children: [
        locationLabel,
        locationCombo,
        latitudeControl,
        longitudeControl,
        epochLabel,
        epochCombo,
        civilTimeReadout,
        lstReadout,
        timeControl,
        fovControl,
        magnitudeControl,
        displayToggles,
      ],
    });

    const panelTitle = new Text(controls.panelTitleStringProperty, {
      font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
      fill: ZenithColors.textColorProperty,
      maxWidth: CONTROL_PANEL_WIDTH - 50,
    });

    // Collapses to the title bar so the sky FOV can reclaim the right-hand space.
    this.controlPanel = new AccordionBox(panelContent, {
      titleNode: panelTitle,
      expandedProperty: new BooleanProperty(true),
      resize: true,
      useExpandedBoundsWhenCollapsed: false,
      useContentWidthWhenCollapsed: false,
      cornerRadius: PANEL_CORNER_RADIUS,
      fill: ZenithColors.panelBackgroundColorProperty,
      stroke: ZenithColors.panelBorderColorProperty,
      contentXMargin: PANEL_X_MARGIN,
      contentYMargin: PANEL_Y_MARGIN,
      contentAlign: "left",
      titleAlignX: "left",
      buttonAlign: "right",
      showTitleWhenExpanded: true,
      titleBarOptions: {
        fill: ZenithColors.panelBackgroundColorProperty,
      },
      expandCollapseButtonOptions: {
        accessibleName: a11y.controls.controlPanelStringProperty,
      },
      accessibleContextResponseExpanded: a11y.controls.controlPanelExpandedStringProperty,
      accessibleContextResponseCollapsed: a11y.controls.controlPanelCollapsedStringProperty,
      accessibleHelpTextExpanded: a11y.controls.controlPanelHelpExpandedStringProperty,
      accessibleHelpTextCollapsed: a11y.controls.controlPanelHelpCollapsedStringProperty,
    });

    // ── Planetarium FOV play area ─────────────────────────────────────────────
    // Initial bounds are refined by updatePlayAreaLayout once the panel is sized.
    this.skyNode = new PlanetariumSkyNode(model, {
      bounds: new Bounds2(
        this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
        this.layoutBounds.minY + SCREEN_VIEW_MARGIN,
        this.layoutBounds.maxX - CONTROL_PANEL_WIDTH - 2 * SCREEN_VIEW_MARGIN,
        this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
      ),
    });
    attachPlanetariumInteraction(this.skyNode, {
      model,
      skyNode: this.skyNode,
      accessibleNameProperty: a11y.controls.skyViewStringProperty,
      accessibleHelpTextProperty: a11y.controls.skyViewHelpStringProperty,
    });
    this.addChild(this.skyNode);

    // Selection readout sits over the play area so the control panel stays shorter.
    const selectionPanel = new SimPanel(selectedReadout, {
      xMargin: 8,
      yMargin: 6,
    });
    this.addChild(selectionPanel);

    // Panel above the sky so the expand/collapse control stays clickable.
    this.addChild(this.controlPanel);

    // ── Reset All button ──────────────────────────────────────────────────────
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

    const updatePlayAreaLayout = (): void => {
      this.controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
      this.controlPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;

      const playBounds = new Bounds2(
        this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
        this.layoutBounds.minY + SCREEN_VIEW_MARGIN,
        this.controlPanel.left - SCREEN_VIEW_MARGIN,
        this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
      );
      this.skyNode.setViewBounds(playBounds);

      selectionPanel.left = playBounds.minX + SELECTION_PANEL_INSET;
      selectionPanel.bottom = playBounds.maxY - SELECTION_PANEL_INSET;

      resetAllButton.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
      resetAllButton.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
      if (resetAllButton.top < this.controlPanel.bottom + RESET_ALL_PANEL_GAP) {
        resetAllButton.top = this.controlPanel.bottom + RESET_ALL_PANEL_GAP;
      }
    };

    // Reflow when the accordion expands/collapses (and on first layout).
    this.controlPanel.boundsProperty.link(updatePlayAreaLayout);

    // ── Accessibility: keyboard / reading traversal order ─────────────────────
    // AccordionBox owns PDOM order for its content; include the box as a whole.
    this.addChild(
      new Node({
        pdomOrder: [this.skyNode, this.controlPanel, resetAllButton],
      }),
    );
  }

  public reset(): void {
    this.controlPanel.reset();
  }

  public override step(dt: number): void {
    this.model.step(dt);
  }
}
