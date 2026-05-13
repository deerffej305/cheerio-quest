# Project context for Claude Code

This is cheerio-quest, a 2D Phaser HTML5 platformer. Working title: Journey to the Center of the Anus. Built by Jeff Reed and his son CJ for a 9th-grade biology class.

## Read these first

- `GAME_DESIGN.md` — full game spec. Single source of truth for mechanics, scoring, modes, leaderboards, rooms, tech stack, and file layout. Read before writing or editing any feature.
- `STORY.md` — narrative bible. Five comic-storyboard cut scenes, character cast with personalities, all dialogue. Read before working on the cut scene system, character art, or boss behavior.

If these documents disagree with this file or with code, the design and story docs are authoritative. Sync the code to them and flag the conflict.

## Tech stack

- Phaser 3 (latest stable)
- JavaScript (not TypeScript — keep it simple)
- Vite for dev server and production bundles
- Cloudflare Pages for static hosting
- Cloudflare Workers + KV for the leaderboard backend
- Node 18+

## Dev commands

```
npm install
npm run dev        # Vite dev server with HMR (1280×720 canvas)
npm run build      # production bundle
npm run preview    # preview the production bundle locally
```

## File layout

Canonical layout is in GAME_DESIGN.md §11. Quick reference:

- `src/main.js` — Phaser entry point + config
- `src/scenes/` — one file per Phaser scene (Boot, Title, GameMode, room scenes, Quiz, Leaderboard, CutScene)
- `src/entities/` — Cheerio + one file per enemy / hazard type
- `src/systems/` — ScoreManager, QuestionBank, LeaderboardClient, InputManager, SoundManager
- `src/data/questions.json` — the question bank (placeholder questions for now; real bank arrives from CJ's class)
- `public/assets/` — sprites, backgrounds, audio (placeholders until Phase 7–8)
- `worker/leaderboard.js` — Cloudflare Worker for the leaderboard backend

## Conventions

- Target resolution is 1280×720 (16:9). All level layouts and HUD positions use this base. Scale responsively to fill the browser.
- Keyboard: arrows or WASD for movement, spacebar or up for jump, Esc to pause. Touch D-pad is the tablet-mode fallback.
- Score lives in a single ScoreManager singleton. Don't mutate score from inside scenes — call manager methods. This keeps the score logic auditable and the leaderboard submission honest.
- Quiz question schema is documented in GAME_DESIGN.md §7. Each question is tagged by room.
- Leaderboards use Cloudflare KV. "Last-write-wins" is acceptable at this scale (50 students max).
- Player states: Big and Small. State transitions documented in GAME_DESIGN.md §4. Big breaks fiber-brick walls and jumps 50% higher.

## What's deferred (don't block on these)

- **Audio.** Wire the SoundManager API now with named keys (`'jump'`, `'stomp'`, `'damage'`, etc.) but leave them as no-ops or silent placeholders. Real SFX come during Phase 8 from Cowork.
- **Art.** Every visual is a placeholder shape until Phase 7. Use solid-color rectangles and circles. Cheerio = yellow ring. Enemies = colored shapes. Cut scenes = labeled boxes ("PANEL 1," "PANEL 2"). Real PNGs drop into `public/assets/` from Cowork later.
- **Real quiz questions.** Use 15–20 placeholder questions of your own writing to test the quiz flow. CJ's class will deliver the 100-question bank later — it just needs to slot into the JSON file at the documented schema.

## How to get unblocked

| Question type | Where to go |
| --- | --- |
| Mechanics / scoring / level layout / boss behavior | Jeff or CJ in Cowork — they'll update `GAME_DESIGN.md` and tell you to re-read |
| Story / dialogue / character voice | Same workflow, via `STORY.md` |
| Art assets needed | Flag it; Jeff returns to Cowork to generate sprites, drops them in `public/assets/` |
| Technical judgment calls | Make the call. Log a one-liner in `DECISIONS.md` with the reasoning so Jeff can review |

## Current build focus

Phases 1–2: scaffold + Mouth room grey-box. Get a playable Mouth room running with placeholder shapes before touching any other room. Full plan is in GAME_DESIGN.md §12.

When you finish a phase, commit, push, and update the task list back in Cowork (Jeff will sync the status when he checks in).
