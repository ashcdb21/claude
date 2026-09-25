# Tactics Lab — Build Order

Work through the phases in order, one at a time. After each: run it in the
browser, check it against that phase's "Verify" list, commit, then move on.
Each phase builds against a section of `SPEC.md`.

| Phase | Goal | Files | Status |
|---|---|---|---|
| 0 | Scaffold: empty repo that runs | `index.html`, `server.js`, `SPEC.md`, `package.json`, `.env.example` | Done |
| 1 | Pitch renderer (metre→pixel transform, markings, portrait rotation, ResizeObserver) | `index.html` | Done |
| 2 | 22 players + ball, Move tool, 4-3-3 vs 4-4-2, carrier within 2.6 m | `index.html` | Done |
| 3 | Voronoi zones (exact clipping) + pitch control (grid + logistic), minimal readout | `index.html` | Done |
| 4 | Passing lanes, "+n" lines broken, offside line, team shape | `index.html` | Done |
| 5 | Runs tool, bend handle (both directions), Play animation | `index.html` | Done |
| 6 | Pass tool + resolution (interception, 35 m lofted rule, into space, toasts, queue behind runs at ~30%) | `index.html` | Done |
| 7 | Formations (7 per side), possession/visibility, base state, localStorage persistence | `index.html` | Done |
| 8 | Side panel / mobile sheet, layer toggles, saved tactics, shortcuts | `index.html` | Done |
| 9 | Visual polish, dark-mode tokens, offscreen background cache | `index.html` | Done |
| 10 | `askClaude()` adapter + `/api/claude` proxy, temporary ping (removed after) | `server.js`, `index.html` | Done |
| 11 | Scenario builder with hand-authored fallback, validated/clamped JSON | `index.html` | Done |
| 12 | Match play with heuristic opponent only | `index.html` | Done |
| 13 | Match play AI opponent + debrief, heuristic fallback | `index.html` | Done |
| 14 | Final QA against "Acceptance checks" at desktop and 390 px | — | Done |

Rule for every phase: only touch the listed files, and don't implement
anything from later phases even if it seems easy to add now.

## Running

```
node server.js        # or: npm start
# PORT defaults to 3000
```

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` before Phase 10.
