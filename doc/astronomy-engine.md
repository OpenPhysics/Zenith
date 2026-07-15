# astronomy-engine vs. hand-rolled coordinate math

Why the sim keeps custom spherical-astronomy code alongside
[`astronomy-engine`](https://github.com/cosinekitty/astronomy), and where the
boundary deliberately sits. Read this before refactoring `src/common/sky/` to
"just use the library."

## TL;DR — the division of labor

| Owned by `astronomy-engine` (via `PlanetEphemeris.ts`) | Owned by the sim (`SkyCoordinates.ts`, `EclipticCoordinates.ts`) |
|---|---|
| Solar-system ephemerides (`Equator`) | Equatorial ↔ horizontal (per-frame, thousands of points) |
| Greenwich apparent sidereal time (`SiderealTime`) | Geometric rise / set / transit |
| Body illumination & magnitude (`Illumination`) | Equatorial ↔ ecliptic (static great-circle sampling) |
| Moon phase elongation (`MoonPhase`) | Angular separation, angular diameter |
| IAU constellation lookup (`Constellation`) | Hour angle, declination bands, coordinate wrapping |
| Solar elongation / visibility (`Elongation`) | |

`PlanetEphemeris.ts` is the **only** file that imports `astronomy-engine`. The
rest of the sim consumes ephemerides through its pure functions and the
`ZenithModel.skySnapshotProperty` cache.

## Why not use `astronomy-engine` for everything?

### 1. `equatorialToHorizontal` is intentionally hand-rolled (keep)

`SkyCoordinates.ts` owns `equatorialToHorizontal` / `horizontalToEquatorial` /
`equatorialToHorizonVector`. astronomy-engine exposes `Horizon()` and the
`Rotation_EQJ_HOR` / `Rotation_HOR_EQJ` matrices, which do the same physics. The
sim's version is **not** needless duplication — three concrete reasons:

1. **Performance.** Every frame the view transforms ~4103 catalog stars (more
   with the deep catalog), plus named stars, constellation line endpoints,
   ecliptic/equator/meridian/grid samples, and solar-system discs. The model
   computes **one** local sidereal time and the transform reuses it for every
   point. `Horizon()` takes a `Date` + `Observer` and recomputes sidereal time
   internally on each call — re-doing that work thousands of times per frame is
   wasteful.
2. **Frame consistency.** Stars and planets share a fixed **J2000 (EQJ)** frame
   (the bright-star catalog is J2000; `PlanetEphemeris.planetEquatorialState`
   passes `ofdate=false`). LST is `normalizeHours(SiderealTime(civil) + lon/15)`.
   The hour angle `LST − RA` therefore carries the small precession/nutation
   offset in RA — see the frame caveat at `PlanetEphemeris.ts:11-18`. `Horizon()`
   operates on the of-date equator (EQD); feeding it J2000 RAs would mix frames
   and break star/planet alignment.
3. **Pole robustness.** The transform is evaluated through the horizon-frame
   vector `(north, east, up)` so azimuth is a division-free `atan2(east, north)`.
   The classical `acos/cos(lat)·cos(alt)` form collapses to ±90° at the poles;
   the vector form stays finite — see `SkyCoordinates.ts:72-95`.

### 2. `riseSetInfo` is geometric on purpose (keep)

`SelectedObjectReadout` reports the next rise / set / transit of the selected
object. astronomy-engine offers `SearchRiseSet`, `SearchHourAngle`, and
`HourAngle`, which overlap. The sim uses the hand-rolled geometric form in
`SkyCoordinates.ts` (`riseSetInfo`, `altitudeAtHourAngle`,
`declinationBand`, `solarHoursUntilLst`) because:

- It works **uniformly for any selected catalog star or planet** from just
  `(RA, Dec, latitude)`. astronomy-engine's search is body-based; using it for
  catalog stars would require `DefineStar` plumbing per selection.
- It is **unrefracted**, matching the unrefracted horizon the sim draws.
  `SearchRiseSet` includes refraction (+34′) and the body's angular radius, so
  its answers would be inconsistent with the horizon line on screen.
- It returns **LST of the event** (transit LST = RA; rise/set from
  `acos(−tan φ · tan δ)`), which composes directly with the sim's LST-driven
  clock. astronomy-engine's search returns a wall-clock `AstroTime` after an
  iterative root-find.

### 3. `EclipticCoordinates.ts` overlaps `Rotation_ECL_EQJ` — but barely matters

`eclipticToEquatorial` is the standard obliquity rotation and duplicates what
`Rotation_ECL_EQJ()` + `RotateVector` + `EquatorFromVector` do. It's the closest
thing to true redundancy here, but:

- It runs **once at module load** to precompute the static ecliptic polyline
  (`CelestialLinesNode.ts:38`), not per frame.
- It returns the sim's native `{ raHours, decDeg }` directly, avoiding vector
  allocation/conversion for a one-time call.
- It's 59 lines of well-tested trig (`tests/EclipticCoordinates.test.ts`).

Not worth replacing. If it ever moves to a per-frame or time-varying (true
ecliptic of date) computation, switch to `Rotation_ECL_EQJ` / `Rotation_EQJ_ECT`.

### 4. `angularSeparationDeg` / `apparentAngularDiameterDeg` — trivial formulas

`angularSeparationDeg` is a sibling of astronomy-engine's `AngleBetween` (RA/Dec
in vs. vectors in) — a one-liner either way. `apparentAngularDiameterDeg`
(`θ = 2·atan(R/d)`) is a plain geometry formula astronomy-engine does not expose
generally (only the Moon's `diam_deg` in `Libration`). Neither is reinvention.

### 5. `SIDEREAL_HOURS_PER_SOLAR_HOUR` is a constant, not a reinvention

`SimConstants.ts` defines `1.00273790935`. astronomy-engine does not expose the
sidereal/solar ratio as a named constant; the sim uses it for the educational
"scrub by sidereal time" feature (`ZenithModel.advanceSiderealTime`), where one
full sidereal day returns the stars to place while the Sun lags ~3 min 56 s.

## When you *should* reach for astronomy-engine instead

- Anything that needs **of-date** coordinates, **refraction**, **precession**,
  or **nutation** (e.g. far-epoch absolute alt/az accuracy).
- **Search-based** events: actual conjunctions, oppositions, equinoxes,
  solstices, lunar phases, max elongation, rise/set with refraction
  (`SearchRelativeLongitude`, `Seasons`, `SearchMoonQuarter`,
  `SearchMaxElongation`, `SearchRiseSet`).
- **Physical data**: body distances, magnitudes, illumination phase, Saturn ring
  tilt (`Illumination`, `HelioDistance`).

Add the new call to `PlanetEphemeris.ts` (keep it the single import boundary)
and expose a pure function plus a `skySnapshotProperty` field if the view needs
it reactively.
