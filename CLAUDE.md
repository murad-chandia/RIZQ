# Tarteeb Rush: notes for contributors

A browser game for Tarteeb (Logistics, RIZQ Society, LUMS). Vanilla HTML/CSS/JS. No build step, no dependencies.

## Files
| File | Role |
|---|---|
| `index.html` | Markup for screens: start, game (HUD, NPC strip, supply area, runner, stations), showdown, overlay card |
| `style.css` | All styling. Colour tokens on `:root` (gold `#C9A227`, black, off-white, greys for other departments) |
| `content.js` | **All player-facing text and level data** on `window.TARTEEB_CONTENT`. Edit jokes here. |
| `game.js` | Logic, in one IIFE. Reads only from `TARTEEB_CONTENT`. |

## Architecture (game.js)
- One `state` object holds everything: screen, level index, timer, readiness, score, items, problems, junk, NPCs, per-level `stats` and run-wide `run` totals.
- Entities are DOM nodes positioned with `transform` inside `#arena`. Coordinates are relative to `#arena`.
- Loop: `requestAnimationFrame` with delta time capped at 50 ms. `update(dt)` runs only while `state.running && !state.paused`. The game pauses when the tab is hidden.
- Input uses pointer events only (`pointerdown/move/up/cancel` on `#arena`). Drag an item onto a station, or tap the item and then tap the station.
- Level modes: `setup` (deliver supplies to stations) and `dismantle` (collect drifting items into Storage).
- Initiative: `spawnProblem` puts a warning chip on a station and spawns a gold fix item. Delivering it during the warning gives `POINTS.prevent` and the banner. After it triggers it gives `POINTS.fix`, and readiness drains while the problem is live.
- Chaos effects live in `CHAOS_EFFECTS` (game.js). `content.chaos` picks which effect each event uses.
- Sound is synthesised with Web Audio in `SFX`. There are no audio files.
- Storage: `store.get/set` wraps `localStorage` in try/catch. Keys are `tarteebRush.highScore` and `tarteebRush.muted`.
- Test hook: `window.__tarteeb.state`.

## Add a roast card
In `content.js`, add one line to `roasts`:
```js
{ dept: 'Marketing', them: 'What they did.', tarteeb: 'What Tarteeb did.' },
```
`tarteeb` may be `''`. Roast departments, never real people. No real names, event names or dates.

## Add a level
In `content.js`, copy a whole `{ ... }` block in `levels` and edit it. The level count updates automatically. Main fields:
- Text: `title`, `intro`, `clearLine`, `timerLabel`, optional `stationNames`, `seatCounter`, `messages`.
- `rules.mode`: `'setup'` or `'dismantle'`.
- `rules.supplies`: supply ids from `supplies`, with weights.
- `rules.problems`: problem ids from `problems`.
- Timers: `problemEvery`, `junkEvery`, `chaosEvery`, `messageEvery` (0 = off).
- The comment above `levels` lists every field.

To add a supply or problem, add it to `supplies` / `problems`. Its `station` must be a station id (`stage`, `registration`, `seating`, `refreshments`).

## Checks before committing
```bash
node --check game.js && node --check content.js
python3 -m http.server 8000   # then open http://localhost:8000 at 375px width
```
