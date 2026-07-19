# CLAUDE.md — Zenith

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

SceneryStack first-person planetarium renderer for the night sky. Forked from
`TemplateSingleSim`. Observer location, civil time (LST derived), and look/FOV
state live in `ZenithModel`; `PlanetariumSkyNode` projects the bright-star
catalog and solar-system bodies (`astronomy-engine`). For multi-screen sims, see
`doc/multi-screen.md`.

Upstream reference material (not shipped with the sim):
`reference/stellarium-web-engine/` — Stellarium Web Engine sources for
projection and sky-rendering ideas.

## Key files

| File | Purpose |
|---|---|
| `src/ZenithColors.ts` | All `ProfileColorProperty` instances |
| `src/SimConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/ZenithNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/zenith-screen/ZenithScreen.ts` | Screen wrapper |
| `src/zenith-screen/model/ZenithModel.ts` | Simulation state and logic |
| `src/zenith-screen/view/ZenithScreenView.ts` | Visual nodes, layout, `screenSummaryContent` + `pdomOrder` |
| `src/zenith-screen/view/PlanetariumSkyNode.ts` | First-person FOV star / ground / grid renderer |
| `src/zenith-screen/view/PlanetariumPlanetsNode.ts` | Sun / Moon / planet discs + labels |
| `src/zenith-screen/view/attachPlanetariumInteraction.ts` | Drag / keyboard pan + Ctrl-time + wheel FOV |
| `src/zenith-screen/model/BrightStarCatalog.ts` | ~4103-star RA/Dec/mag catalog |
| `src/zenith-screen/model/SolarSystemBodies.ts` | Planet display metadata (`planets.ini`) |
| `src/common/sky/SkyCoordinates.ts` | Equatorial ↔ horizontal transforms (intentionally hand-rolled; see [doc/astronomy-engine.md](doc/astronomy-engine.md)) |
| `src/common/sky/PlanetEphemeris.ts` | The only `astronomy-engine` import boundary — ephemerides, sidereal time, illumination, Moon phase |
| `src/zenith-screen/view/ZenithScreenSummaryContent.ts` | Accessible screen summary (reference a11y pattern) |
| `src/zenith-screen/view/ZenithKeyboardHelpContent.ts` | Keyboard-help dialog content |
| `src/common/ZenithHotkeyData.ts` | Planetarium HotkeyData (listeners + help dialog) |
| `src/preferences/zenithQueryParameters.ts` | Public deep-link params (`lat`, `lon`, `date`, `fov`, `magLimit`) |
| `src/common/SimPanel.ts` | Pre-themed `Panel` wrapper (uses `ZenithColors` automatically) |
| `src/common/SimButtonOptions.ts` | Flat button-appearance option bundles + light-control-surface combo-box options |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `scripts/generate-icons.ts` | PNG icons from `public/icons/icon.svg` |
| `scripts/rename-sim.ts` | Automated fork/rename across all files and folders |

## Common components

### SimPanel

Every control panel and info box in the sim should use `SimPanel` so that
default/projector color switching is automatic:

```typescript
import { SimPanel } from "../../common/SimPanel.js";
const panel = new SimPanel(content);              // uses ZenithColors defaults
const panel = new SimPanel(content, { xMargin: 20 }); // override any PanelOption
```

### TimeModel

For simulations with animation, compose `TimeModel` into your screen model:

```typescript
import { TimeModel } from "../../common/TimeModel.js";

export class FrictionModel implements TModel {
  public readonly timer = new TimeModel();   // starts paused; pass true to auto-play

  public step(dt: number): void {
    this.timer.step(dt);
    // use this.timer.timeProperty.value for physics
  }
  public reset(): void { this.timer.reset(); /* … */ }
}
```

Wire the view to `TimeControlNode` from `scenerystack/scenery-phet` binding on
`model.timer.isPlayingProperty`.

### SimButtonOptions

SceneryStack's push/round buttons default to a 3-D/beveled look; every button in the sim
should be flat instead. Spread these into the relevant options object:

```typescript
import { FLAT_RESET_ALL_BUTTON_OPTIONS, FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";

const resetAllButton = new ResetAllButton({ ...FLAT_RESET_ALL_BUTTON_OPTIONS, listener: () => {...} });
const exampleButton = new RectangularPushButton({ ...FLAT_RECTANGULAR_BUTTON_OPTIONS, content, listener });
```

`FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS` spreads into `TimeControlNode`'s `playPauseStepButtonOptions`;
`TIME_CONTROL_SPEED_RADIO_OPTIONS` fixes `TimeControlNode`'s speed-radio label color, which
otherwise defaults to black text on the sim's dark default-mode panels. `SIM_COMBO_BOX_OPTIONS`
themes a `ComboBox`'s button/list chrome to the light control surface below; pair item labels
with `LIGHT_SURFACE_TEXT_FILL` (not `ZenithColors.textColorProperty`, which is for panel-fill text).

`ZenithColors.ts` backs this with a "light control surfaces" section —
`controlSurfaceColorProperty`, `controlSurfaceDisabledColorProperty`,
`controlSurfaceTextColorProperty` — identical white/dark-text values in both default and
projector profiles, so any component that must stay light regardless of theme (combo boxes,
flat buttons, editable fields) keeps readable contrast automatically.

## Accessibility

This template is the **canonical accessibility reference** for OpenPhysics sims. It ships with
the three required layers wired up: PDOM names, a `ZenithScreenSummaryContent`, and an explicit
`pdomOrder` + `ZenithKeyboardHelpContent`. A11y strings live under the `a11y` key in each locale
JSON, exposed via `StringManager.getA11yStrings()`. When building a real sim, make
`currentDetailsContent` a live `DerivedProperty` over model state and add `accessibleName`s to
every interactive node. Full convention and checklist: [../Baton/ACCESSIBILITY.md](../Baton/ACCESSIBILITY.md).

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | Test environment + `setupFiles` when present; `execArgv: ["--expose-gc"]` with memory-leak suite |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports (when required) |
| `tests/**/*.test.ts` | Model/physics unit tests — mirror `src/` under `tests/` |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

- Put unit tests only under root `tests/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.
- Expand `memory-leak.test.ts` for components that add/remove nodes or link Properties at runtime (see OpticsLab).

## Customizing a new sim from this template

### Automated rename (recommended)

```sh
npm run rename -- --id friction --name "Friction"
# or for multi-word names:
npm run rename -- --id wave-interference --name "Wave Interference"
```

This replaces all template identifiers in file contents and renames files/folders. Run `npm run check` afterwards to verify TypeScript is clean.

### Manual checklist (if not using the rename script)

1. **Rename** — replace `zenith` / `Zenith` / `Sim` prefix in `init.ts`, `brand.ts`, `package.json`, class names, and screen folders
2. **Locale** — add `strings_XX.json`, register in `StringManager`, add locale to `init.ts` `availableLocales`
3. **Icon** — edit `public/icons/icon.svg`, run `npm run icons`; match theme color in `index.html` / `vite.config.ts`
4. **Colors** — edit `ZenithColors.ts` (`default` + `projector` profiles per property)

## Multi-screen sims

Full guide: **`doc/multi-screen.md`**

Summary:
- Create a new screen folder mirroring `src/zenith-screen/` for each screen
- Add screen-name keys to all locale JSON files
- Expose new `StringProperty` getters in `StringManager.getScreenNames()`
- For shared state, create a root model passed to each per-screen model
- Register all screens in the `screens` array in `main.ts`

## Using this template beyond a direct copy

| Approach | When to use |
|---|---|
| **GitHub template** ("Use this template" button) | Starting a single new sim |
| `npm run rename` after cloning | Same, automated |
| **npm workspace / monorepo** | Managing a suite of sims with shared tooling |
| **`npm create` scaffolder** | Org-wide standardized sim bootstrapping |
| **git subtree** for pulling updates | Keeping forks in sync with template improvements |

See `doc/multi-screen.md` → "Using this template beyond a direct copy" for details on each approach.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
