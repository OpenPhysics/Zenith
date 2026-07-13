# Implementation Notes - Zenith

## Architecture Overview

Zenith is a SceneryStack **first-person planetarium**. The model owns observer
location, civil time (with derived LST), look/FOV state, display toggles, and
object selection; the view projects a bright-star catalog, named-star labels,
constellation stick figures, solar-system discs, and coordinate overlays into a
rectangular sky panel.

```
main.ts
  └─ ZenithScreen
       ├─ ZenithModel          observer + civil clock + look/FOV + overlays + selection
       └─ ZenithScreenView
            ├─ PlanetariumSkyNode          (FOV: stars + overlays + labels)
            ├─ PlanetariumPlanetsNode
            ├─ SelectedObjectReadout
            ├─ attachPlanetariumInteraction
            ├─ SimPanel controls
            ├─ ZenithScreenSummaryContent
            └─ ZenithKeyboardHelpContent

src/common/sky/SkyCoordinates.ts   equatorial ↔ horizontal
src/common/sky/PlanetEphemeris.ts  astronomy-engine wrapper
src/zenith-screen/model/BrightStarCatalog.ts
src/zenith-screen/model/NamedBrightStars.ts
src/zenith-screen/model/ConstellationLines.ts
src/zenith-screen/model/LocationPreset.ts
src/zenith-screen/model/EpochPreset.ts
src/zenith-screen/model/SolarSystemBodies.ts
reference/stellarium-web-engine/   (gitignored local reference)
```

## Projection pipeline

1. Catalog star, named star, constellation endpoint, or planet (RA hours, Dec degrees;
   catalog/named/planets are J2000; constellation HIPs are Hipparcos J1991.25)
2. `equatorialToHorizontal(ra, dec, lat, lst)` → alt/az
3. Cull below horizon (when shown) and outside FOV
4. Map to panel pixels centered on `lookAzimuth` / `lookAltitude` with
   horizontal span = FOV and vertical span = FOV × (height / width), so °/px
   is equal in X and Y under zoom and aspect-ratio changes

LST is `normalizeHours(SiderealTime(civil) + longitudeDeg/15)` so stars and
planets share one clock.

Inspired by Stellarium Web Engine’s observer → frame → project path, implemented
in TypeScript with Scenery nodes (no WASM / HiPS). Planet positions use
`astronomy-engine`; visual colors/radii follow `planets.ini`.

## Interaction

- Drag / arrows → pan look az/alt
- Ctrl-drag / Ctrl+arrows → advance civil time (LST follows)
- Click (small motion) → select nearest named star or planet
- N / P → cycle selectable objects in the FOV
- Escape → clear selection
- Scroll wheel → change FOV
- TimeControlNode → play/pause/step + SLOW/NORMAL/FAST
- Location / epoch ComboBoxes → jump observer site or civil epoch
- Year / month / day / hour NumberControls → arbitrary UTC civil jump (marks epoch CUSTOM)
- Checkboxes → alt/az grid (with tick labels), cardinals, meridian, RA/Dec grid (with tick labels), horizon, planets, atmosphere, true-scale discs
- Preferences → Simulation → star names, constellation lines, planet names
  (these overlays outlive Reset All; also seedable via query parameters)

Sun and Moon discs are always sized from apparent angular diameter vs FOV
(degrees → pixels). Planets stay exaggerated for visibility unless **True-scale
discs** is checked.

Sky color follows solar altitude (day → twilight → night) when atmosphere is on.
Stars, star labels, and constellation figures fade as the Sun rises. Turning
atmosphere off keeps a night sky with stars fully visible (Stellarium-style).

Keyboard Shortcuts (`?`) are documented in `ZenithKeyboardHelpContent` from
`ZenithHotkeyData` (pan, Ctrl+arrows for civil time, N/P select, Escape) plus
scroll-wheel FOV.

## Deep-link query parameters

Public startup params in `zenithQueryParameters.ts` seed `ZenithModel`
(and overlay preferences where noted):

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

Example classroom link:
`index.html?lat=-33.9&lon=151.2&date=2024-12-21T10:00:00Z&fov=60&magLimit=4`

## Deferred

- Saturn rings
- Planetary moons, eclipses, HiPS imagery
- Circumpolar / rise–set cues for a selected object
