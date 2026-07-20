# Multi-Screen Simulations

Developer guide for extending Zenith beyond its current **single planetarium
screen**. For the pedagogical model and architecture notes, see
[README.md](./README.md).

A natural split for this sim is **Planetarium** (first-person FOV — what ships
today) plus a second mode such as **All-Sky** (whole celestial sphere as a
chart). Other classroom pairings work the same way: Planetarium + Seasons,
Planetarium + Coordinates, etc. This guide uses Planetarium + All-Sky
throughout.

---

## Architecture patterns

### Single-screen (current Zenith)

```
main.ts
  └─ ZenithScreen            (Screen<ZenithModel, ZenithScreenView>)
       ├─ ZenithModel         observer + civil clock + look/FOV + overlays
       └─ ZenithScreenView    PlanetariumSkyNode + controls
```

### Multi-screen with independent state (simplest)

Each screen is self-contained. Use this when screens do not share observer
state — for example a static “About the sky” intro and a fully separate
planetarium lab.

```
main.ts
  ├─ PlanetariumScreen     (Screen<ZenithModel, ZenithScreenView>)   ← existing
  │    ├─ ZenithModel
  │    └─ ZenithScreenView
  └─ AllSkyScreen          (Screen<AllSkyModel, AllSkyScreenView>)
       ├─ AllSkyModel
       └─ AllSkyScreenView
```

### Multi-screen with shared model (recommended)

A root **observer** model owns location and civil time so switching tabs keeps
the same “where / when.” Each screen model receives that shared reference and
adds view-specific state (look/FOV on Planetarium; chart projection on All-Sky).

```
main.ts  →  creates ObserverModel (lat, lon, civilTime, …)
  ├─ PlanetariumScreen    → ZenithModel(observer)
  └─ AllSkyScreen         → AllSkyModel(observer)
```

Shared candidates in Zenith: `latitudeProperty`, `longitudeProperty`,
`civilTimeMsProperty` / LST sync, location & epoch presets, magnitude limit,
atmosphere / planet toggles. Keep look azimuth, altitude, and FOV on the
planetarium screen only.

---

## Step-by-step: adding an All-Sky screen

### 1 — Add strings

`src/i18n/strings_en.json` (and every other locale file):

```json
{
  "title": "Zenith",
  "screens": {
    "planetarium": "Planetarium",
    "allSky": "All-Sky"
  }
}
```

**Important:** All locale files must define identical keys. TypeScript will error
at compile time if any key is missing (see the `satisfies` checks in
`StringManager.ts`).

### 2 — Expose screen-name properties in StringManager

```typescript
// src/i18n/StringManager.ts
public getScreenNames(): {
  readonly planetariumStringProperty: ReadOnlyProperty<string>;
  readonly allSkyStringProperty: ReadOnlyProperty<string>;
} {
  return {
    planetariumStringProperty: stringProperties.screens.planetariumStringProperty,
    allSkyStringProperty: stringProperties.screens.allSkyStringProperty,
  };
}
```

### 3 — Create the second screen folder

Keep `src/zenith-screen/` as the planetarium; add a sibling for the chart:

```
src/
├─ zenith-screen/                 ← Planetarium (existing)
│   ├─ ZenithScreen.ts
│   ├─ model/
│   │   └─ ZenithModel.ts
│   └─ view/
│       ├─ ZenithScreenView.ts
│       ├─ PlanetariumSkyNode.ts
│       ├─ ZenithScreenSummaryContent.ts
│       └─ ZenithKeyboardHelpContent.ts
└─ all-sky-screen/
    ├─ AllSkyScreen.ts
    ├─ model/
    │   └─ AllSkyModel.ts
    └─ view/
        ├─ AllSkyScreenView.ts
        ├─ AllSkyChartNode.ts       ← e.g. zenith-centered whole-sky plot
        ├─ AllSkyScreenSummaryContent.ts
        └─ AllSkyKeyboardHelpContent.ts
```

Each screen file follows the same `Screen<Model, View>` pattern as
`ZenithScreen.ts`. Reuse `src/common/sky/` (`SkyCoordinates`, `PlanetEphemeris`)
and the star / constellation catalogs from both screens.

### 4 — (Optional) Create a shared observer model

If location and civil time should persist across tabs:

```typescript
// src/model/ObserverModel.ts
import { NumberProperty } from "scenerystack/axon";
import {
  DEFAULT_CIVIL_TIME_MS,
  DEFAULT_LATITUDE_DEG,
  DEFAULT_LONGITUDE_DEG,
} from "../ZenithConstants.js";

export class ObserverModel {
  public readonly latitudeProperty = new NumberProperty(DEFAULT_LATITUDE_DEG);
  public readonly longitudeProperty = new NumberProperty(DEFAULT_LONGITUDE_DEG);
  public readonly civilTimeMsProperty = new NumberProperty(DEFAULT_CIVIL_TIME_MS);

  public reset(): void {
    this.latitudeProperty.reset();
    this.longitudeProperty.reset();
    this.civilTimeMsProperty.reset();
  }
}
```

Per-screen models take it as a constructor argument:

```typescript
// src/zenith-screen/model/ZenithModel.ts  (sketch)
export class ZenithModel implements TModel {
  public constructor(public readonly observer: ObserverModel) {
    // look/FOV, overlays, selection stay on this screen
  }

  public step(dt: number): void { /* advance observer.civilTimeMsProperty, sync LST */ }
  public reset(): void {
    this.observer.reset();
    /* reset look/FOV and planetarium-only Properties */
  }
}
```

```typescript
// src/all-sky-screen/model/AllSkyModel.ts
export class AllSkyModel implements TModel {
  public constructor(public readonly observer: ObserverModel) {}

  public step(dt: number): void { /* same civil clock via observer */ }
  public reset(): void { this.observer.reset(); /* reset chart-only state */ }
}
```

Move LST sync, location/epoch presets, and ephemeris inputs onto `ObserverModel`
(or keep thin wrappers on each screen model that read the same Properties).

### 5 — Register both screens in main.ts

```typescript
// src/main.ts  (inside onReadyToLaunch)

const observer = new ObserverModel();

const screens = [
  new ZenithScreen(observer, {
    name: stringManager.getScreenNames().planetariumStringProperty,
    tandem: Tandem.ROOT.createTandem("planetariumScreen"),
    backgroundColorProperty: ZenithColors.backgroundColorProperty,
    preferences: simPreferences,
  }),
  new AllSkyScreen(observer, {
    name: stringManager.getScreenNames().allSkyStringProperty,
    tandem: Tandem.ROOT.createTandem("allSkyScreen"),
    backgroundColorProperty: ZenithColors.backgroundColorProperty,
    preferences: simPreferences,
  }),
];

const sim = new Sim(stringManager.getTitleStringProperty(), screens, { … });
```

Pass `ZenithPreferencesModel` into both screens if star names / constellations /
planet labels should stay in sync with Preferences → Simulation.

---

## Screen options reference

| Option | Type | Purpose |
|---|---|---|
| `name` | `ReadOnlyProperty<string>` | Localizable tab label |
| `tandem` | `Tandem` | PhET-iO registration root |
| `backgroundColorProperty` | `TReadOnlyProperty<Color>` | Screen background |
| `createKeyboardHelpNode` | `() => Node` | Per-screen keyboard help |
| `homeScreenIcon` | `ScreenIcon` | Icon on the home screen |
| `navigationBarIcon` | `ScreenIcon` | Smaller icon in the nav bar |
| `maxDT` | `number` | Maximum allowed dt in seconds |
| `targetFrameRate` | `number` | Target FPS for `step()` |

---

## Home screen icons

Multi-screen sims show a home screen by default. Each screen needs a 548×373 px
`ScreenIcon` (or the SceneryStack default is used):

```typescript
import { ScreenIcon } from "scenerystack/sim";
import { Rectangle } from "scenerystack/scenery";

// Prefer a tiny sky sketch per screen (horizon strip vs full-sky disc)
const icon = new ScreenIcon(
  new Rectangle(0, 0, 548, 373, { fill: ZenithColors.backgroundColorProperty }),
  { maxIconWidthProportion: 1, maxIconHeightProportion: 1 }
);
```

Pass it as `homeScreenIcon` and `navigationBarIcon` on the Screen options.

---

## Accessibility across screens

Each screen must have its own `ScreenSummaryContent` and `KeyboardHelpContent`.
The strings live under per-screen keys in the a11y block (Zenith already nests
planetarium a11y under a flat `a11y` object — split when you add a second
screen):

```json
"a11y": {
  "planetarium": {
    "screenSummary": {
      "playArea": "First-person planetarium view of the sky…",
      "controlArea": "…",
      "interactionHint": "Drag the sky to look around…"
    },
    "currentDetails": "Latitude {{latitude}}°, looking toward…"
  },
  "allSky": {
    "screenSummary": {
      "playArea": "All-sky chart centered on the zenith…",
      "controlArea": "…",
      "interactionHint": "…"
    },
    "currentDetails": "Latitude {{latitude}}°, local sidereal time {{lst}} h…"
  }
}
```

Expose them via separate methods in `StringManager`:

```typescript
public getPlanetariumA11yStrings() { return stringProperties.a11y.planetarium; }
public getAllSkyA11yStrings() { return stringProperties.a11y.allSky; }
```

---

## Using this template beyond a direct copy

### GitHub template repository

The repository is configured as a GitHub template. Use the **"Use this
template"** button on GitHub to create a new repository pre-populated with all
template files. Then run:

```sh
npm install
npm run rename -- --id my-sim --name "My Simulation"
npm run check
```

### `npm create` workflow (scaffold new projects)

If your organisation maintains multiple sims, create an npm initializer that
wraps the rename step:

```sh
npm create openphysics-sim@latest my-sim
# → clones the template, runs npm run rename automatically
```

The rename logic lives in the template's own `scripts/` directory — copy it
into your initializer rather than depending on a per-sim copy.

### Monorepo / workspace setup

For organisations building a suite of simulations, a pnpm/npm workspace lets
you share tooling while keeping each sim independent:

```
physics-sims/
├─ package.json          # workspace root (workspaces: ["sims/*"])
├─ sims/
│   ├─ zenith/           # this planetarium sim
│   ├─ waves/
│   └─ optics/
└─ shared/               # optional: shared assets, design tokens
```

Each sim is still independently deployable; the workspace just gives you a
single `npm run build --workspaces` command to build all of them.

### Git subtree for template updates

To pull template improvements back into an existing fork:

```sh
# One-time: add the template as a remote
git remote add template https://github.com/OpenPhysics/TemplateSingleSim.git

# Pull template changes into a branch for review
git fetch template
git merge template/main --allow-unrelated-histories --squash
```

Review the diff carefully — class-name changes in the template may conflict
with your sim-specific renames.
