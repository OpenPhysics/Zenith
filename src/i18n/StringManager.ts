/**
 * StringManager.ts
 *
 * Centralizes all localized string access for the simulation.
 */

import type { ReadOnlyProperty } from "scenerystack/axon";
import { LocalizedString } from "scenerystack/chipper";
import stringsEn from "./strings_en.json";
import stringsEs from "./strings_es.json";
import stringsFr from "./strings_fr.json";

// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsFr);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsFr satisfies typeof stringsEn);

const stringProperties = LocalizedString.getNestedStringProperties({
  en: stringsEn,
  fr: stringsFr,
  es: stringsEs,
});

export class StringManager {
  private static instance: StringManager | null = null;

  private constructor() {
    // Private — obtain via getInstance()
  }

  public static getInstance(): StringManager {
    if (StringManager.instance === null) {
      StringManager.instance = new StringManager();
    }
    return StringManager.instance;
  }

  public getTitleStringProperty(): ReadOnlyProperty<string> {
    return stringProperties.titleStringProperty;
  }

  public getScreenNames(): {
    readonly planetariumStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      planetariumStringProperty: stringProperties.screens.planetariumStringProperty,
    };
  }

  public getA11yStrings() {
    return stringProperties.a11y;
  }

  public getKeyboardHelpStrings() {
    return stringProperties.keyboardHelp;
  }

  public getPreferences() {
    return stringProperties.preferences;
  }

  public getControls() {
    return stringProperties.controls;
  }

  public getBodies() {
    return stringProperties.bodies;
  }

  public getStars() {
    return stringProperties.stars;
  }

  public getConstellations() {
    return stringProperties.constellations;
  }

  public getCardinals() {
    return stringProperties.cardinals;
  }

  public getLocations() {
    return stringProperties.locations;
  }

  public getEpochs() {
    return stringProperties.epochs;
  }
}
