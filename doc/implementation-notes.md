# Implementation Notes — Zenith (for developers)

Developer guide to architecture, model state, projection, and extension points.
For the pedagogical / classroom description of what the sim models, see
[model.md](./model.md). Template multi-screen patterns:
[multi-screen.md](./multi-screen.md).

---

## Architecture overview

Zenith is a SceneryStack **first-person planetarium**. `ZenithModel` owns
observer location, civil time (with derived LST), look/FOV, display toggles, and
object selection. The view projects the bright-star catalog, named-star labels,
constellation stick figures, solar-system discs, and coordinate overlays into a
rectangular sky panel.

```
main.ts
  └─ ZenithScreen
       ├─ ZenithModel          observer + civil clock + look/FOV + overlays + selection
       └─ ZenithScreenView
            ├─ PlanetariumSkyNode          (FOV: stars + overlays + labels)
            │    └─ CelestialLinesNode     (coordinates, ecliptic, and object paths)
            ├─ PlanetariumPlanetsNode
            ├─ SelectedObjectReadout
            ├─ attachPlanetariumInteraction
            ├─ SimPanel controls
            ├─ ZenithScreenSummaryContent
            └─ ZenithKeyboardHelpContent

src/common/sky/SkyCoordinates.ts   equatorial ↔ horizontal
src/common/sky/EclipticCoordinates.ts  equatorial ↔ ecliptic
src/common/sky/PlanetEphemeris.ts  astronomy-engine wrapper
src/zenith-screen/model/BrightStarCatalog.ts
src/zenith-screen/model/DeepStarCatalog.ts
src/zenith-screen/model/NamedBrightStars.ts
src/zenith-screen/model/ConstellationLines.ts
src/zenith-screen/model/LocationPreset.ts
src/zenith-screen/model/EpochPreset.ts
src/zenith-screen/model/SolarSystemBodies.ts
src/zenith-screen/view/SkyProjection.ts
reference/stellarium-web-engine/   (gitignored local reference)
```

Inspired by Stellarium Web Engine’s observer → frame → project path, implemented
in TypeScript with Scenery nodes (no WASM / HiPS). Planet positions use
`astronomy-engine`; visual colors/radii follow Stellarium `planets.ini`.

---

## Model state (`ZenithModel`)

| Property | Units | Notes |
|---|---|---|
| `timer.isPlayingProperty` | — | Play/pause for sky motion (`TimeModel`) |
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
| `showGridProperty` | — | Alt/az grid + tick labels |
| `showCardinalsProperty` | — | N/S/E/W labels + zenith marker |
| `showMeridianProperty` | — | Local meridian arcs |
| `showEquatorialGridProperty` | — | Coarse RA/Dec grid + tick labels |
| `showHorizonProperty` | — | Ground band + horizon line |
| `showAtmosphereProperty` | — | Twilight sky colors + daytime star fade |
| `showPlanetsProperty` | — | Sun / Moon / planets |
| `trueScaleBodiesProperty` | — | Planet discs use true angular size (Sun/Moon always do) |
| `showPlanetLabelsProperty` | — | Name tags (also Preferences; survives Reset All) |
| `showStarLabelsProperty` | — | Curated bright-star name tags (Preferences) |
| `showConstellationsProperty` | — | Stick figures (Preferences) |
| `deepStarCatalogProperty` | — | Whether the deeper Hipparcos catalog is rendered (Preferences) |
| `showEclipticProperty` | — | Whether the ecliptic great circle is drawn |
| `showCelestialEquatorProperty` | — | Whether the celestial equator great circle is drawn |
| `showObjectPathProperty` | — | Whether the selected object's 24 h diurnal path is drawn |
| `magnitudeLimitProperty` | mag | Cull fainter catalog stars |
| `selectedObjectProperty` | SelectedSkyObject \| null | Click/keyboard-selected star or planet |
| `measureStartProperty` | EquatorialCoordinates \| null | First endpoint of angular measurement tool |
| `measureEndProperty` | EquatorialCoordinates \| null | Second endpoint of angular measurement tool |
| `measureSeparationDegProperty` | degrees \| null | Derived angular separation between endpoints |
| `skySnapshotProperty` | SkySnapshot | Derived instantaneous ephemeris snapshot of solar-system bodies |
| `solarAltitudeDegProperty` | degrees | Derived; drives twilight sky + star fade |

Defaults (Boulder, CO; look south; epoch `2024-06-21 18:00 UTC`) and ranges live
in `src/SimConstants.ts`. Named location / epoch tables:
`LocationPreset.ts`, `EpochPreset.ts`. Startup deep-links:
`src/preferences/zenithQueryParameters.ts`.

### Step / reset

- `step(dt)` advances `TimeModel` and civil time by
  `dt × CIVIL_HOURS_PER_SIM_SECOND × speed`, then resyncs LST.
- `advanceCivilTimeHours` / `advanceSiderealTime` / `stepForward` support
  Ctrl-drag and the step button (civil scrub).
- `reset()` restores every Property and the timer (including presets and
  selection). Overlay preferences that live in Preferences
  (`showStarLabels`, `showConstellations`, `showPlanetLabels`) are **not**
  cleared by Reset All.

---

## Projection pipeline

1. Catalog star, named star, constellation endpoint, or planet (RA hours, Dec
   degrees; catalog/named/planets are J2000; constellation HIPs are Hipparcos
   J1991.25)
2. `equatorialToHorizontal(ra, dec, lat, lst)` → alt/az
3. Map to panel pixels via `SkyProjection` (which implements an azimuthal
   stereographic/fisheye projection). The look direction defines a camera basis
   (forward $F$, screen right, screen up). A sky point's unit vector is expressed
   in that basis $(x, y, z)$ with $z$ toward the view center, then projected:
   $$sx = cx + \frac{2 \cdot focal \cdot x}{1 + z}$$
   $$sy = cy - \frac{2 \cdot focal \cdot y}{1 + z}$$
   so $z = 1$ (the view center) maps to the screen center $(cx, cy)$.
4. Cull if the point lies behind the camera (specifically, farther than
   `PROJECTION_CULL_DEG` or $150^\circ$ from the view center, where the projection
   diverges to infinity), or below the horizon (when the horizon is shown and
   the object is below altitude 0°).

LST is `normalizeHours(SiderealTime(civil) + longitudeDeg/15)` so stars and
planets share one clock.

Sun and Moon discs are always sized from apparent angular diameter vs FOV
(degrees → pixels). Planets stay exaggerated for visibility unless
`trueScaleBodiesProperty` is on.

Sky color follows solar altitude (day → twilight → night) when atmosphere is on.
Stars, star labels, and constellation figures fade as the Sun rises. Atmosphere
off keeps a night sky with stars fully visible.

---

## Catalogs / ephemeris

| Module | Role |
|---|---|
| `BrightStarCatalog.ts` | ~4103 stars (mag ≤ 5.8), flat RA/Dec/mag arrays (J2000) |
| `DeepStarCatalog.ts` | ~25,700 stars (mag ≤ 7.5), flat RA/Dec/mag arrays (J2000) |
| `NamedBrightStars.ts` | Curated classroom stars for labels and selection |
| `ConstellationLines.ts` | Stick-figure segments for all 88 IAU constellations (Stellarium western culture; HIP-keyed) |
| `PlanetEphemeris.ts` | `astronomy-engine` wrapper: Sun, Moon, Mercury–Neptune (J2000 equatorial, mag, distance, Moon phase, angular diameter) |
| `SolarSystemBodies.ts` | Display metadata (color, exaggerated disc clamps, physical radius) from `planets.ini` |

Shared transform: `equatorialToHorizontal` in `src/common/sky/SkyCoordinates.ts`.

---

## Interaction

Wired in `attachPlanetariumInteraction` and control-panel listeners:

| Input | Effect |
|---|---|
| Drag / arrows | Pan look az/alt |
| Ctrl-drag / Ctrl+arrows | Advance civil time (LST follows) |
| Shift-click | Measure angular distance between two points |
| Click (small motion) | Select nearest named star or planet |
| N / P | Cycle selectable objects in the FOV |
| Escape | Clear selection / measurement |
| Scroll wheel | Change FOV |
| TimeControlNode | Play/pause/step + SLOW/NORMAL/FAST |
| Location / epoch ComboBoxes | Jump observer site or civil epoch |
| Year / month / day / hour NumberControls | Arbitrary UTC civil jump → epoch `CUSTOM` |
| Checkboxes | Alt/az grid, cardinals, meridian, RA/Dec grid, horizon, planets, atmosphere, true-scale discs, ecliptic, celestial equator, selected object path |
| Preferences → Simulation | Star names, constellation lines, planet names, deeper star catalog (also seedable via query params) |

Keyboard Shortcuts (`?`) come from `ZenithKeyboardHelpContent` / `ZenithHotkeyData`.

---

## Deep-link query parameters

Public startup params in `zenithQueryParameters.ts` seed `ZenithModel` (and
overlay preferences where noted):

| Param | Meaning | Example |
|---|---|---|
| `lat` | Observer latitude (°N) | `?lat=-33.9` |
| `lon` | Observer longitude (°E) | `&lon=151.2` |
| `date` | Civil UTC (`Date.parse` / ISO-8601) | `&date=2024-12-21T10:00:00Z` |
| `fov` | Horizontal FOV (°) | `&fov=60` |
| `magLimit` | Faintest visible magnitude | `&magLimit=4` |
| `showStarLabels` | Star name labels (also Preferences) | `&showStarLabels=false` |
| `showConstellations` | Stick figures (also Preferences) | `&showConstellations=true` |
| `showPlanetLabels` | Planet labels (also Preferences) | `&showPlanetLabels=false` |
| `deepStarCatalog` | Deeper Hipparcos star catalog (also Preferences) | `&deepStarCatalog=true` |

Example classroom link:

`index.html?lat=-33.9&lon=151.2&date=2024-12-21T10:00:00Z&fov=60&magLimit=4`

---

## Deferred

- Saturn rings
- Planetary moons, eclipses, HiPS imagery
- Circumpolar / rise–set cues for a selected object
