# Contributing to LAN LORD XP 🎮

This game is a **community build**. Bugs, jokes, music, items and full features are all welcome. You don't have to be a "real" game dev; plenty of contributions are just text.

## 🟢 Easiest ways to contribute (no game-dev experience needed)
| What | Where | Example |
|---|---|---|
| Customer thoughts, reviews, Mom yells, news headlines | `src/content_extra.ts`, `src/social_extra.ts`, `src/data.ts` (`THOUGHTS`, `REVIEWS`) | `"my ping just hit a phone number"` |
| New LimeWire files (real and cursed) | `CATALOG` in `src/limewire.ts` | `"free_smileys_pack.exe"` |
| Clan tags, screen-name presets | `src/social_extra.ts`, `src/prologue.ts` | `"[LAG]"` |
| Era hairstyles and fits for the creator | `src/prologue.ts` + `drawPerson` in `src/render.ts` | Hot Topic wristbands |

## 🟡 Medium
- **New buildable items:** add an `ItemDef` and a drawing function in `src/items_extra.ts`. All art is drawn in code with the helpers exported from `src/render.ts` (`box`, `faceQuad`, `iso`, …).
- **New music:** add a `Track` in `src/tracks_era2.ts` using the synth kit in `src/audio.ts` (`guitar`, `midi`, `woah`, `drums`, `trackerArp`).
  - ⚠️ **Original melodies only.** Parody titles and parody artist names are fine. Real songs, hooks, lyrics or samples are not, because we can't license them.
- **New random events:** see `hourly()` in `src/sim.ts`.

## 🔴 Big stuff
New locations (`LOCATIONS` in `src/data.ts`), rival Bob, boss tournaments, multiplayer… open an issue first so we can plan it together.

## Dev setup
```bash
git clone https://github.com/lanlordxp/lanlordxp.github.io.git
cd lanlordxp.github.io
npm install
npm run dev          # http://localhost:5173  (add ?chaos for an instant late-game sandbox)
npm run build        # typecheck + production build
```
Headless sim checks (Node):
```bash
npx esbuild tests/ai_audit.ts --bundle --platform=node --outfile=tests/ai_audit.cjs && node tests/ai_audit.cjs
```

## Code map
| File | What it does |
|---|---|
| `src/sim.ts` | Deterministic simulation: customers, queue, heat, WiFi, economy, events, staff, prestige |
| `src/render.ts` | Canvas2D isometric renderer, all art drawn in code |
| `src/ui.ts` | Windows XP desktop UI: top bar, pop-up windows, MSN toasts |
| `src/prologue.ts` | Split-screen cinematic prologue and character creator |
| `src/tutorial.ts` | Spotlight tutorial |
| `src/limewire.ts` | LimeWire.exe 🍋 |
| `src/audio.ts` | WebAudio synth and Winamp sequencer (no audio files) |
| `src/data.ts` | Content: items, research, locations, perks, text |

## Rules of the house
- Keep it **absurd, nostalgic and PG-13**. Punch at 2004 culture, not at people.
- Run `npm run build` before opening a PR (it typechecks).
- Small PRs are best: one feature or one batch of jokes.
- Be kind in issues and reviews. We're all just trying to keep the basement from catching fire.
