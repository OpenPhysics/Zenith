# Model

## Purpose

Zenith models a first-person planetarium: an observer on Earth looking at the
celestial sphere. Geographic latitude / longitude, **civil time**, derived local
sidereal time, and look direction / FOV determine which stars and solar-system
bodies appear on screen.

## State

| Property | Units | Notes |
|---|---|---|
| `timer.isPlayingProperty` | — | Play/pause for sky motion |
| `timer.timeProperty` | s | Elapsed simulation time |
| `timeSpeedProperty` | TimeSpeed | SLOW / NORMAL / FAST multiplier |
| `locationPresetProperty` | LocationPreset | Named sites; `CUSTOM` when lat/lon scrubbed |
| `epochPresetProperty` | EpochPreset | Solstice/equinox jumps; `CUSTOM` when time advances |
| `latitudeProperty` | degrees (+N) | Observer latitude |
| `longitudeProperty` | degrees (+E) | Observer longitude |
| `civilTimeMsProperty` | ms (UTC epoch) | Advances while playing; drives ephemerides |
| `localSiderealTimeHoursProperty` | hours `[0, 24)` | Synced from GAST + longitude |
| `lookAzimuthDegProperty` | degrees (N→E) | FOV center azimuth |
| `lookAltitudeDegProperty` | degrees | FOV center altitude |
| `fieldOfViewDegProperty` | degrees | Horizontal FOV |
| `showGridProperty` | — | Altitude tick overlays |
| `showCardinalsProperty` | — | N/S/E/W labels + zenith marker |
| `showMeridianProperty` | — | Local meridian arcs |
| `showEquatorialGridProperty` | — | Coarse RA/Dec grid |
| `showHorizonProperty` | — | Ground band + horizon line |
| `showPlanetsProperty` | — | Sun / Moon / planets |
| `showPlanetLabelsProperty` | — | Name tags for preferred bodies |
| `showStarLabelsProperty` | — | Curated bright-star name tags |
| `showConstellationsProperty` | — | Classroom stick figures |
| `magnitudeLimitProperty` | mag | Cull fainter catalog stars |
| `selectedObjectProperty` | SelectedSkyObject \| null | Click/keyboard-selected star or planet |
| `solarAltitudeDegProperty` | degrees | Derived; drives twilight sky + star fade |

Defaults (Boulder, CO; look south; epoch `2024-06-21 18:00 UTC`) and ranges live
in `src/SimConstants.ts`. Named location / epoch tables live in
`LocationPreset.ts` and `EpochPreset.ts`. Startup deep-links (`lat`, `lon`,
`date`, `fov`, `magLimit`, overlay toggles) live in `zenithQueryParameters.ts`.

## Step / reset

- `step(dt)` advances `TimeModel` and civil time by
  `dt × CIVIL_HOURS_PER_SIM_SECOND × speed`, then resyncs LST.
- `advanceCivilTimeHours` / `advanceSiderealTime` / `stepForward` support
  Ctrl-drag and the step button (civil scrub).
- `reset()` restores every Property and the timer (including presets and
  selection).

## Catalogs / ephemeris

- `BrightStarCatalog.ts` — ~4103 stars (mag ≤ 5.8) as flat RA/Dec/mag arrays
  (J2000).
- `NamedBrightStars.ts` — curated classroom stars for labels and selection.
- `ConstellationLines.ts` — stick-figure segments (Ursa Major, Orion,
  Cassiopeia, Southern Cross).
- `PlanetEphemeris.ts` — `astronomy-engine` wrapper for Sun, Moon, Mercury–Neptune
  (J2000 equatorial + visual magnitude).
- `SolarSystemBodies.ts` — display metadata (color, disc size clamps) from
  Stellarium `planets.ini`.

Projection uses `equatorialToHorizontal` from `src/common/sky/SkyCoordinates.ts`
for stars, constellations, and planets.
