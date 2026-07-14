# Model — Zenith (for teachers)

This document describes the **conceptual model** of Zenith: what the simulation
represents, which ideas students can explore, and useful classroom hooks.
For architecture, properties, and code entry points, see
[implementation-notes.md](./implementation-notes.md).

---

## What Zenith models

Zenith is a **first-person planetarium**. Students stand as an observer on Earth
and look at a rectangular patch of sky. What they see depends on:

1. **Where** they are (latitude and longitude)
2. **When** it is (civil date and time in UTC)
3. **Which way** they look (azimuth and altitude) and how wide the view is
   (field of view)

As time advances, the sky rotates with the Earth’s spin, the Sun’s altitude
changes day into night, and the planets move along their orbits. Stars are fixed
on the celestial sphere; their rising, setting, and altitude change only because
the Earth turns and the observer’s location changes.

---

## Core ideas students encounter

### Observer location

Latitude sets how high the celestial pole sits above the horizon and which
stars are circumpolar. Longitude (with civil time) sets which part of the sky
is overhead at a given clock time.

Named presets jump to teaching sites:

| Preset | Why it is useful |
|---|---|
| Boulder (default) | Mid-northern latitude; familiar starting view |
| Greenwich | Longitude 0° — compare clock time and sky |
| Equator | Zenith near the celestial equator; poles on the horizon |
| North / South Pole | Extreme diurnal paths; opposite seasons |
| Sydney | Southern hemisphere; December is summer |

Scrubbing latitude or longitude marks the location as custom.

### Civil time and the moving sky

The simulation clock advances **civil time** (calendar date and UTC clock).
Local sidereal time is derived from that civil time and the observer’s
longitude; it is what actually lines up the star catalog with the horizon.

At normal speed, about **one hour of sky time passes per second of wall time**,
so diurnal motion is easy to see. SLOW / NORMAL / FAST change that rate.
Play, pause, step, Ctrl-drag on the sky, and date presets all move the same
civil clock.

Date/time presets target classroom epochs (≈ 18:00 UTC so day/night contrast
works across many longitudes):

- Default (2024-06-21 — near June solstice)
- March / September equinoxes
- June / December solstices

Year / month / day / hour controls jump to any UTC civil moment in range
(1900–2100).

### Look direction and field of view

- **Azimuth** — compass direction of the view center (0° = north, 90° = east,
  180° = south, …)
- **Altitude** — angle above the horizon (0° on the horizon, 90° at the zenith)
- **Field of view** — horizontal width of the sky panel (about 40°–120°)

Drag or arrow keys pan; the scroll wheel or FOV slider zooms. Default look is
south at a modest altitude — a natural outdoor “looking up” pose.

### Coordinate systems (overlays)

Students can turn on overlays that name the same sky in two common languages:

| Overlay | What it shows |
|---|---|
| Altitude–azimuth grid | Local horizon system (where things are *from here*) |
| Cardinals + zenith | N / S / E / W and the point straight up |
| Local meridian | North–south great circle through the zenith |
| Equatorial RA/Dec grid | Celestial coordinates (where things are *on the sphere*) |
| Celestial equator | Declination 0° — the projection of Earth's equator |
| Ecliptic | The Sun's yearly path; the plane the planets track near |
| Selected object path | The 24 h diurnal circle the selected object traces |
| Horizon / ground | Separates sky from Earth |

Selecting a named star or planet shows magnitude, RA/Dec, altitude/azimuth, and
its **rise / set / transit** times (or a circumpolar / never-rises note),
together — useful for connecting the two systems. The **local solar time**
readout sits beside UTC so students can see why noon on the clock is not when the
Sun is highest.

### Identifying and measuring

- **Hover** over any star or planet to see its name without clicking.
- **Click** to select it and read its details; **N / P** cycle through objects.
- **Shift-click** two points (snapping to nearby objects) to measure the
  **angular distance** between them in degrees — a line and the angle appear on
  the sky. Escape clears it.

### Stars, constellations, and planets

- **Bright stars** — catalog stars down to about magnitude 5.8; a magnitude
  limit hides fainter ones for less clutter.
- **Deeper star catalog** — an optional Hipparcos-based catalog of about 25,700
  stars down to magnitude 7.5, enabled via Preferences → Simulation.
- **Star names** — curated bright-star labels (Preferences → Simulation, or
  panel options depending on build).
- **Constellations** — stick figures for all 88 IAU constellations (western
  culture figures).
- **Sun, Moon, planets** — positions from solar-system ephemerides. Sun and Moon
  discs use true angular size; planets are exaggerated unless “true-scale discs”
  is on (otherwise they would be nearly invisible).

### Atmosphere and daylight

With atmosphere on, sky color follows the Sun’s altitude (day → twilight →
night), and stars fade as the Sun rises — closer to real outdoor viewing.
Turning atmosphere off keeps a permanent night sky so stars stay fully visible
for daytime teaching demos (Stellarium-style).

---

## Suggested classroom explorations

1. **Latitude and Polaris** — From Boulder, find Polaris near the north celestial
   pole; move to the equator or poles and watch how polar altitude tracks
   latitude.
2. **Seasons and day length** — Jump between June and December solstices at the
   same site; compare Sun path and length of night. Repeat from Sydney.
3. **Equinoxes** — On an equinox preset, check where the Sun rises/sets relative
   to east/west with the horizon and cardinals on.
4. **Northern vs southern sky** — Same UTC epoch in Boulder and Sydney: which
   constellations are up? Is Orion “upright”?
5. **Civil time vs sky** — Pause at noon and midnight (UTC hour control); note
   which stars are up. Advance time with play or Ctrl-drag and watch the whole
   sky rotate.
6. **Coordinate translation** — Select a bright star; read RA/Dec and alt/az,
   then turn on both grids so students see both frames at once.
7. **Planet scale** — Toggle true-scale discs next to the Moon to discuss why
   planets look like points to the naked eye.

---

## Sharing a starting sky (deep links)

You can open the sim with a prepared observer and epoch in the URL, for example:

`?lat=-33.9&lon=151.2&date=2024-12-21T10:00:00Z&fov=60&magLimit=4`

Useful parameters: `lat`, `lon`, `date` (ISO-8601 UTC), `fov`, `magLimit`, plus
optional toggles for star names, constellation lines, planet names, and the
deeper star catalog. Full list:
[implementation-notes.md](./implementation-notes.md#deep-link-query-parameters).

---

## What the model simplifies

Zenith is a teaching planetarium, not a full-sky survey tool:

- No atmospheric refraction, light pollution maps, or telescope optics
- No planetary moons, Saturn rings, eclipses, or deep-sky imagery
- Constellation figures are cultural stick figures, not constellation boundaries
- Planet discs may be exaggerated for visibility (unless true-scale is enabled)
- Time control is educational (sped-up civil hours), not a real-time clock by
  default

Those limits keep the interface focused on location, time, coordinates, and
naked-eye sky motion.

---

## Accuracy & limitations

Zenith aims for a transparent, fast model that is trustworthy near the present
day rather than for research-grade astrometry. Where it trades precision for
clarity:

- **Stars use fixed J2000 coordinates.** Catalog positions are mean equatorial
  RA/Dec for epoch J2000.0, applied as-is: no precession to the display date and
  no proper motion. Near 2000–2050 the resulting drift is only about
  arcminutes, but it grows for dates far from J2000 — precession alone moves
  positions on the order of ~1° over ~70 years.
- **Planets, Sun, and Moon share the star frame.** Their positions come from
  `astronomy-engine`, requested in the J2000 (EQJ) frame so they stay internally
  consistent with the fixed star catalog.
- **A small frame mix in sidereal time.** Local sidereal time is Greenwich
  *apparent* sidereal time (GAST) plus longitude, while star and planet
  coordinates use the J2000 *mean* equinox. Combining an apparent-equinox hour
  angle with mean-equinox coordinates introduces a sub-arcminute to arcminute
  inconsistency — negligible for teaching.
- **No atmospheric refraction.** Objects rise and set at true geometric altitude
  0°, about 34 arcminutes later (rising) or earlier (setting) than the real,
  refracted horizon.
- **No nutation or stellar aberration.**
- **Sky motion is true sidereal.** The advance-sky gesture and diurnal rotation
  run at the sidereal rate; a sidereal day is about 3 min 56 s shorter than a
  solar day.

For research-grade positions a full ICRF→observed pipeline (precession,
nutation, aberration, refraction — as in the bundled Stellarium Web Engine
reference, `src/frames.c`) would be required.
