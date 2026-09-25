# Tactics Lab — Spec

Build a browser-based interactive football (soccer) tactics board called **Tactics Lab**.

## Output and constraints
- One self-contained `index.html`: inline CSS and JS, no build step, no framework, no npm packages. Fonts may come from Google Fonts with a real fallback stack.
- Rendering is a single `<canvas>` (2D context), sized to the viewport with devicePixelRatio scaling. All drawing is done in **pitch metres** via a canvas transform, never in pixels.
- Also write a tiny optional `server.js` (Node, no dependencies) that serves the file and proxies `POST /api/claude` to the Anthropic Messages API using `ANTHROPIC_API_KEY` from the environment. See "AI features" below.
- Keep it under ~2000 lines total. Comment the geometry and the tactical models, not the obvious DOM code.

## Pitch and coordinate system
- Pitch is 105 m (x) by 68 m (y). x=0 is our goal line, x=105 the opposition's. y=0 is the touchline on our left. Our team ("home", blue) attacks towards x=105; the opposition ("away", red) attacks towards x=0. Goal mouth spans y = 30.34 to 37.66.
- Draw full markings to real dimensions: penalty areas 16.5 × 40.32, six-yard boxes 5.5 × 18.32, penalty spots at x=11, centre circle r=9.15, penalty arcs (arc of the 9.15 circle beyond the box edge), corner arcs, goals.
- On portrait viewports (height > width × 1.08), rotate the whole board so our team attacks up the screen. Do this with the canvas transform, and counter-rotate text so shirt numbers and labels stay upright.

## Data model
- Seven formations, each 11 slots of `[x, y, role, unit, number]` with unit one of G/D/DM/M/AM/A: 4-3-3, 4-2-3-1, 4-4-2, 4-1-4-1, 3-5-2, 3-4-3, 5-3-2. Away teams are these mirrored through the pitch centre.
- Each player holds: current position, a **base** position, an optional **run** (end point plus a signed `bend`), and base copies of the run so "back to base" restores planned movement too.
- The ball is a position. The carrier is the nearest player within 2.6 m.

## Analysis models (the core of the app)
1. **Zones (Voronoi).** Compute each player's region exactly by clipping the pitch rectangle with the perpendicular bisector half-plane against every other player (Sutherland–Hodgman). Report the polygon area in m² as "space owned". Fill by team colour, stroke the edges.
2. **Control (pitch control).** On a 0.5 m grid, take the distance to the nearest home player and the nearest away player and map the difference through a logistic: `p = 1 / (1 + exp(-(d_away - d_home) / 2.6))`. Render as a soft tint (alpha proportional to `|2p-1|^0.9`, capped around 0.35 so the grass reads through) plus a smooth 50% contour drawn with marching squares on the same grid. Report each team's share of the pitch as the mean of p.
3. **Passing lanes.** For the ball carrier and the selected player, draw lanes to teammates within 42 m. A lane is blocked if an opponent's perpendicular distance to the segment is less than `1.3 + 0.05 × min(distance along from either end)`. Blocked lanes are dashed red, open lanes white with the width falling off over distance.
4. **Lines broken.** Group each team's outfielders by unit and take the mean x of each unit. A pass breaks a line when a unit's mean x lies between passer and receiver in the attacking direction. Badge open line-breaking passes with "+n".
5. **Offside line.** Second-last defender's x, or the ball if it's further forward, never behind halfway. Ring attackers who are beyond it.
6. **Team shape.** Convex hull of outfielders, with width, depth and hull area in the readout.

## Interaction
- Three tools in a floating bottom toolbar: **Move**, **Runs**, **Pass** (shortcuts V, R, P).
- Move: drag any player; drag the ball; dragging the carrier carries the ball.
- Runs: drag from a player to set a run end point. Every run has a **draggable midpoint handle** that bends it either way (a quadratic Bézier whose control point is offset perpendicular to the chord; solve the handle drag back to the signed curve coefficient, clamp to ±0.7, snap to 0 near straight). Runs must bend in both directions — a fixed bend direction is a bug.
- Pass: drag from the ball onto a teammate, onto the end of a teammate's planned run, or into empty space. If runs are planned the pass is queued and plays with them; otherwise it plays immediately.
- **Pass resolution.** The ball is intercepted if a defender sits within `1.0 + 0.045 × pass length` of the ball's straight path, measured to the receiver's end position. Passes over 35 m are lofted: they clear everyone in transit but are lost if a defender is within 4 m of the landing point. A pass into space goes to whoever is nearest the landing point. Show the outcome in a brief toast and switch possession accordingly.
- **Play** animates all runs simultaneously over ~2.2 s with an ease-in-out, along their bent paths, with the ball released about 30% in. Coverage, lanes and the readout recompute every frame.
- Space plays, B returns to base, C cycles coverage, Esc deselects, Delete removes the selected run.

## Layout and visual direction
- Full-bleed board. Dark surround with a floodlight radial gradient and vignette, mown stripes, a faint noise texture, and a soft shadow under the pitch. Cache this background to an offscreen canvas and redraw it only on resize.
- Players are shaded discs with a white rim, a drop shadow and a condensed shirt number. Role labels only show on hover or selection unless a "Role labels" layer is on. The carrier gets a dashed white ring, the selection a glowing amber ring.
- A persistent right-hand panel (viewport ≥ 900 px wide and landscape) holds, in order: Match play, Scenarios, Readout, Selected player, Layers, Match state, Saved tactics, Shortcuts. Below that width the same panel opens as a sheet from a toolbar button. Nothing important lives behind a hover.
- Type: a condensed face for headings and shirt numbers, a normal grotesque for body. Colour tokens on `:root`, redefined under `prefers-color-scheme: dark` and under an explicit `data-theme`, with the grass unchanged in both.
- Persist board state, saved setups and a dismissed-hint flag in `localStorage`, wrapped in try/catch, rendering correctly when storage is empty.

## AI features
Route all model calls through one adapter, `askClaude(prompt, {json, onText, signal})`. If `window.claude?.complete` exists use it; otherwise POST to `/api/claude`, which `server.js` proxies to `https://api.anthropic.com/v1/messages` with the key from the environment. Never put an API key in the client. Degrade gracefully with a clear message when neither route is available.

**A. Scenario builder.** A textarea plus a Build button. The prompt tells the model the coordinate convention, asks for 2–4 scenarios, each being one ~2 s phase: starting positions for all 22 players, an optional run for each mover, an optional pass receiver, plus `name`, `theyDo`, `weDo`, 2–4 `cues` and a `risk`. Strict JSON only, parsed and validated (11 per side, coordinates clamped, runs capped at 20 m). The panel lists the scenarios; picking one loads it onto the board; Play runs it. Ship one hand-authored example scenario set (a high press against three ways of playing out from the back) so the feature works with no model available.

**B. Match play.** Turn-based: the model attacks, the user defends.
- Four preset situations plus free text; the model returns a starting setup with a win condition (`half`, `final3`, `box` or `score`) and a phase count of 3–5.
- Each phase: the user may move each of their players within a ring around their phase-start position (12 m easy, 9 m normal, 6 m hard), and cannot get closer than 1.6 m to the ball. Draw the rings.
- On Lock in, send the model the full geometry: both teams' positions, which passes from the carrier are currently open or cut out, lines broken, nearest defender to each attacker, the offside line, and the log of previous phases. State the resolution rules verbatim in the prompt so its reasoning matches the engine. It returns `thinking` (one or two sentences naming the gap in the user's shape, in the second person), `runs` (≤ 12 m each), and one action: pass, dribble (≤ 8 m, lost if a defender is within 1.6 m of the path) or shoot (sample five goal-mouth lanes, block on outfielders, then a keeper check and a distance-scaled conversion).
- A pass to a player offside at the start of the phase is given offside.
- Resolve, animate, log the phase, then check the win conditions: the defender wins on any turnover, block, save, offside or by surviving all phases; the attacker wins by scoring or reaching the target zone.
- Include a built-in heuristic opponent as a fallback when no model is reachable: score candidate run destinations on free space, forward progress and whether they open a lane, then pick the best uncut pass, else dribble into the largest gap.
- On game over, offer a model-written debrief (three short plain-text paragraphs, no markdown) and a Try again that replays the same setup.

## Acceptance checks
- Dragging a player changes coverage, lane status and the readout immediately, with no visible stutter at 22 players.
- A run handle dragged to either side of the chord produces the matching curve, and the animation follows that curve.
- A pass through a gap completes; the same pass with a defender moved into the lane is intercepted and possession flips.
- In match play the opponent's stated reasoning matches what the engine resolves (if it says a lane is open and passes there, the pass should complete).
- The board is usable on a 390 px-wide phone in portrait, with nothing hidden under the system bars.

Build in this order: pitch rendering and dragging, then the analysis models, then runs and passes, then the panel and persistence, then the AI features last. (See the separate build-order document for the full phase-by-phase breakdown.)
