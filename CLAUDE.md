# CLAUDE.md — Zenith

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/CLAUDE.md).

## Project

SceneryStack **first-person planetarium** for the night sky. Observer location, civil time (with derived LST), look direction, and field of view live in `ZenithModel`; `PlanetariumSkyNode` projects the bright-star catalog and solar-system bodies. Architecture: [doc/model.md](doc/model.md), [doc/implementation-notes.md](doc/implementation-notes.md). Upstream reference (not shipped): `reference/stellarium-web-engine/` for projection and sky-rendering ideas.

## Key files

| Area | Location |
|---|---|
| Screen | `src/zenith-screen/ZenithScreen.ts` |
| Model | `zenith-screen/model/ZenithModel.ts`, `BrightStarCatalog.ts` (~4103 stars, mag ≤ 5.8), `DeepStarCatalog.ts`, `NamedBrightStars.ts`, `ConstellationLines.ts`, `SolarSystemBodies.ts`, `objectSearch.ts` |
| Sky math | `src/common/sky/SkyCoordinates.ts` (hand-rolled equatorial↔horizontal), `EclipticCoordinates.ts`, `PlanetEphemeris.ts` (sole `astronomy-engine` import boundary), `SkyTwilight.ts`, `civilDateTime.ts` |
| Views | `zenith-screen/view/ZenithScreenView.ts`, `PlanetariumSkyNode.ts`, `PlanetariumPlanetsNode.ts`, `SkyProjection.ts`, `attachPlanetariumInteraction.ts`, `ObserverLocationNode.ts`, `TimeControlPanel.ts` |
| Colors / constants | `src/ZenithColors.ts`, `src/ZenithConstants.ts` |
| Strings | `src/i18n/StringManager.ts` |
| Preferences / query params | `src/preferences/zenithQueryParameters.ts` (public deep-link params) |
| Entry | `src/main.ts` |

## Model

`ZenithModel implements TModel`. Civil time drives ephemerides; LST is derived from GAST + longitude.

| Property | Meaning |
|---|---|
| `latitudeProperty` / `longitudeProperty` | Observer site (+N / +E degrees); presets jump to teaching locations |
| `civilTimeMsProperty` | UTC epoch ms; advances while playing at signed rate ladder (−30000× … +30000×) |
| `localSiderealTimeHoursProperty` | Derived; lines up star catalog with horizon |
| `lookAzimuthDegProperty` / `lookAltitudeDegProperty` / `fieldOfViewDegProperty` | FOV center and width |
| `magnitudeLimitProperty` | Cull fainter catalog stars |
| `deepStarCatalogProperty` | When true, **replaces** bright catalog with Hipparcos subset (~25,700 stars, mag ≤ 7.5) |
| `selectedObjectProperty` / `trackSelectedObjectProperty` | Click/keyboard selection + camera tracking |
| `timer: TimeModel` | Play/pause; **starts playing** at 1× |

**Gotchas**

- **Ctrl-drag** and **Ctrl+arrow keys** advance **sidereal time** (stars move 1:1 with gesture); civil time advances ~1/1.0027 as fast.
- Reset All restores model Properties but **not** preference-backed overlays (`showStarLabels`, `showConstellations`, `showPlanetLabels`, `deepStarCatalog`).
- Planet positions use `astronomy-engine` only through `PlanetEphemeris.ts`; equatorial↔horizontal transforms are intentionally hand-rolled (see [doc/astronomy-engine.md](doc/astronomy-engine.md)).
- Default sky: Boulder (40° N, 105° W), 2024-06-21 18:00 UTC, look south 30° alt, 140° FOV.

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
`ZenithScreenView` registers `ZenithScreenSummaryContent` (live `currentDetailsContent` over model state) via the `screenSummaryContent` super-option, and orders the PDOM through a wrapper `Node` with `ZenithKeyboardHelpContent`. A11y strings live under the top-level `a11y` key in each locale JSON, via `StringManager.getA11yStrings()`.

## Compliance carve-outs

- **Hardcoded colors:** `#ffffff` pin stroke in `ObserverLocationNode.ts` — fixed white ring for map legibility on both land and ocean fills; not a profile theme token.

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | Test environment + `setupFiles`; `execArgv: ["--expose-gc"]` with memory-leak suite |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

| File | Covers |
|---|---|
| `ZenithModel.test.ts` | Defaults, reset, sidereal vs civil advance, tracking |
| `SkyCoordinates.test.ts`, `EclipticCoordinates.test.ts`, `SkyProjection.test.ts` | Coordinate transforms and projection |
| `PlanetEphemeris.test.ts`, `BrightStarProjection.test.ts` | Ephemerides and star placement |
| `SkyTwilight.test.ts`, `moonPhaseShape.test.ts` | Sky color and Moon phase glyph |
| `civilDateTime.test.ts`, `zenithQueryParameters.test.ts` | Time formatting and deep-link parsing |
| `objectSearch.test.ts`, `NamedBrightStars.test.ts`, `keyboardShortcuts.test.ts` | Search ranking, named stars, hotkeys |
| `TimeModel.test.ts` | Play/pause elapsed time |
| `memory-leak.test.ts` | Dispose regression |

- Put unit tests only under root `tests/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

## Development notes

**Public deep-link query parameters** (`src/preferences/zenithQueryParameters.ts`): `lat`, `lon`, `date` (ISO-8601 UTC), `fov`, `magLimit`, `showStarLabels`, `showConstellations`, `showPlanetLabels`, `deepStarCatalog`. Example: `?lat=-33.9&lon=151.2&date=2024-12-21T10:00:00Z&fov=90&magLimit=4`.

**Star catalogs:** bundled bright catalog = **4103** NAAP-recovered stars (mag ≤ 5.8); optional deep catalog replaces it at render time (Preferences + `?deepStarCatalog=true`).

- After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
