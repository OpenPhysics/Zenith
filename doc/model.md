/**
 * doc/model.md — Zenith planetarium model
 *
 * Observer location and the simulation clock drive the sky projection.
 * The view never mutates these Properties; it only observes them.
 */

# Model

## Purpose

Zenith models a planetarium: an observer on Earth looking at the celestial
sphere. Geographic latitude / longitude and local sidereal time determine how
the sky is oriented on the dome.

## State

| Property | Units | Notes |
|---|---|---|
| `timer.isPlayingProperty` | — | Play/pause for sky motion |
| `timer.timeProperty` | s | Elapsed simulation time |
| `latitudeProperty` | degrees (+N) | Observer latitude |
| `longitudeProperty` | degrees (+E) | Observer longitude |
| `localSiderealTimeHoursProperty` | hours `[0, 24)` | Advances while playing |

Defaults (Boulder, CO) and ranges live in `src/SimConstants.ts`.

## Step / reset

- `step(dt)` advances `TimeModel` and wraps local sidereal time when playing.
- `reset()` restores every Property and the timer.

## Planned extensions

- Star / deep-sky catalog positions (RA/Dec → alt/az for the observer)
- Sun, Moon, and planet ephemerides
- Field of view and look direction for a first-person sky view
- Animation rate (sidereal vs. accelerated day)
