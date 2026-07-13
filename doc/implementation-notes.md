# Implementation Notes - Zenith

## Architecture Overview

Zenith is a SceneryStack planetarium renderer. The model owns observer location
and the simulation clock (local sidereal time); the view projects the celestial
sphere for that observer. Scaffolded from TemplateSingleSim (model/view,
color profiles, localization, Reset All, a11y).

### High-Level Architecture

```
main.ts
  └─ ZenithScreen             (Screen<ZenithModel, ZenithScreenView>)
       ├─ ZenithModel          observer + clock  (src/zenith-screen/model/)
       └─ ZenithScreenView     planetarium view  (src/zenith-screen/view/)
            ├─ ZenithScreenSummaryContent     (PDOM overview)
            └─ ZenithKeyboardHelpContent      (keyboard help dialog)

src/common/
  ├─ SimPanel.ts           pre-themed panel (all screens share ZenithColors)
  └─ TimeModel.ts          composable play/pause + elapsed time

src/preferences/
  ├─ ZenithPreferencesModel   sim-specific pref state
  ├─ ZenithPreferencesNode    pref UI shown in Preferences → Simulation
  └─ zenithQueryParameters    query-parameter declarations

reference/stellarium-web-engine/   (optional local reference; gitignored)
```

Data flows Model → View through AXON `Property` objects. The view observes
properties via `.link()` or `.lazyLink()` and updates reactively.

## Model Components

### ZenithModel

Coordinates planetarium state:

- `timer` — `TimeModel` (starts playing) for sky animation
- `latitudeProperty` / `longitudeProperty` — observer location (degrees)
- `localSiderealTimeHoursProperty` — hours in `[0, 24)`, advances with the clock

Add catalog stars, Sun/Moon ephemerides, and field-of-view state as further
`Property` objects. Keep units SI / degrees as documented in `SimConstants.ts`.

### TimeModel (common)

`src/common/TimeModel.ts` is a reusable play/pause + elapsed-time model.
Compose it into screen models rather than subclassing.

## View Components

### ZenithScreenView as Coordinator

The screen view demonstrates layout using `layoutBounds`, night-sky fill from
`ZenithColors.ts`, and a `ResetAllButton` wired to `model.reset()`. Replace the
placeholder title with a dome / sky-projection Node that reads observer
latitude, longitude, and local sidereal time.

### Reference renderer

`reference/stellarium-web-engine/` holds Stellarium Web Engine sources for
ideas on projection math and sky drawing. Do not import that tree into the
sim bundle; reimplement patterns in SceneryStack (Path / Canvas / WebGL).

## Next steps

1. Implement a `PlanetariumDomeNode` (or similar) under `src/zenith-screen/view/`
2. Wire latitude / longitude / LST controls with `SimPanel` + a11y strings
3. Add star catalog data under `public/` or `src/` and project it each frame
4. Grow `currentDetailsContent` into a live `DerivedProperty` over model state
