/**
 * LocationPreset.ts
 *
 * Named observer sites for the location ComboBox. CUSTOM means the user set
 * latitude/longitude manually (or via Reset All defaults that match Boulder).
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";

export class LocationPreset extends EnumerationValue {
  public static readonly BOULDER = new LocationPreset();
  public static readonly GREENWICH = new LocationPreset();
  public static readonly EQUATOR = new LocationPreset();
  public static readonly NORTH_POLE = new LocationPreset();
  public static readonly SOUTH_POLE = new LocationPreset();
  public static readonly SYDNEY = new LocationPreset();
  public static readonly CUSTOM = new LocationPreset();

  public static readonly enumeration = new Enumeration(LocationPreset);
}

/** Geographic coordinates for each named preset (+N lat, +E lon). */
export const LOCATION_PRESET_COORDS = new Map<LocationPreset, { latitudeDeg: number; longitudeDeg: number }>([
  [LocationPreset.BOULDER, { latitudeDeg: 40, longitudeDeg: -105 }],
  [LocationPreset.GREENWICH, { latitudeDeg: 51.5, longitudeDeg: 0 }],
  [LocationPreset.EQUATOR, { latitudeDeg: 0, longitudeDeg: 0 }],
  [LocationPreset.NORTH_POLE, { latitudeDeg: 90, longitudeDeg: 0 }],
  [LocationPreset.SOUTH_POLE, { latitudeDeg: -90, longitudeDeg: 0 }],
  [LocationPreset.SYDNEY, { latitudeDeg: -33.9, longitudeDeg: 151.2 }],
]);

/** Default preset matching ZenithConstants Boulder defaults. */
export const DEFAULT_LOCATION_PRESET = LocationPreset.BOULDER;
