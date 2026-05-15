# Build Status — where we are

**Last updated:** 2026-05-15 (Claude Code session — Esophagus rework, quiz-advance fix, sound coverage)

This is a rolling status document. Read it after `CLAUDE.md`, `GAME_DESIGN.md`, and `STORY.md` to get the current picture. Jeff updates it after Cowork sessions so Claude Code stays in sync.

---

## Where the project stands

| Area | Status |
| --- | --- |
| **Design (Game Design Document)** | ✅ Complete and locked. See `GAME_DESIGN.md`. |
| **Story + cut scenes** | ✅ Complete and locked. Five comic-storyboard cut scenes drafted, with CJ's revisions applied. See `STORY.md`. |
| **Phase 1–2 — Scaffold + Mouth room** | ✅ Done. Mouth room playable end-to-end with the Tongue boss, chomping teeth, cavity bacteria, saliva dissolve, fiber token, swallow exit. |
| **Phase 3–4 — Quiz UI + remaining rooms** | ✅ Done. End-of-room quiz with 20 placeholder questions, all six rooms (Mouth → Esophagus → Stomach → Small Intestine → Large Intestine → Anus) playable in sequence. |
| **Phase 5–6 — Leaderboards + Quiz Mode** | ✅ Done. Cloudflare Worker + KV at `cheerio-quest-leaderboard.jeff-a23.workers.dev` backing three boards (points, correct, streak). Quiz Mode is sudden-death with streak tracking. |
| **Phase 7 — Art pass** | 🛠️ In progress. Cowork is generating the art now. Placeholders still in place: yellow ring for Crispy, colored shapes for enemies / bosses, labeled "PANEL N" boxes for cut scenes. Real PNGs drop into `public/assets/`. |
| **Phase 8 — Audio pass** | 🛠️ Pipeline complete; awaiting real recorded audio from Cowork. 10 .wav files in `public/assets/audio/` baked from the procedural recipes (see `scripts/gen-audio.js`). BootScene preloads them; SoundManager prefers loaded samples over the procedural fallback. Drop in real recordings at the same paths and rebuild — no code changes. Added 2026-05-15: `crunch` (segment locks shut) and `squelch` (segment starts squeezing) for the new Esophagus mechanic. |
| **Phase 9 — Polish + accessibility** | 🛠️ In progress. Done: death animations, projector-legible HUD/menu text, pause menu, mute toggle, **quiz→next-room advance bug fixed (2026-05-15)** — Phaser scene-instance reuse left `_advanced`/`_returning`/`_exited` flags true between runs, blocking second-and-later quiz transitions. Pending: full accessibility review on a projector. |
| **Phase 10 — Deploy** | ✅ Live at `cheerio-quest.pages.dev` AND `crispygutrunner.com` (+ `www.`). Cloudflare Pages direct-upload, deployed off the local `dist/` because the auto-build from GitHub stalled. Custom domain attached, GoDaddy parking A records cleaned out of the CF zone (2026-05-15), CNAMEs flatten the apex to `cheerio-quest.pages.dev`, edge SSL active. |
| **Quiz bank (100 questions)** | ⏳ Awaiting CJ's class. 20 placeholder questions in `src/data/questions.json`; schema in `GAME_DESIGN.md §7`. |

---

## Most recent design decisions (apply these)

These were locked in during the latest Cowork session. Some override earlier assumptions.

### Esophagus mechanic (2026-05-15 — supersedes earlier "descending crunch bar")

- **No bar that descends.** The death-line is a single `waveY` that descends through the tube, but it's *visualized* as muscle-segment crushers extending from the walls and meeting in the middle. Touching a fully-closed segment = die.
- **Wall is tiled floor-to-ceiling** with segments (no random Ys, no gaps). Each segment is 150px tall; ~31 segments at current room height. Each has a constant 14px base extrusion so the wall reads as ribbed muscle even at rest.
- **One-way wave.** Once a segment closes, it locks shut permanently — the wall builds downward behind the wave. Wave stops after passing the bottom.
- **Branching folds removed.** Earlier split-path layout sometimes had impassable walls; killed entirely. Fiber token now sits on a normal walkable ring.
- **Mucus speed-boost patches removed.** Player feedback: "I don't know what those blue things are."
- **Comfortable margin.** Cheerio terminal velocity 480 px/s > wave 360 px/s, so a clean straight-down fall finishes with ~5s of margin. The threat is hitting platforms and stalling.
- **Room geometry.** Tube is now 5200px tall (was 3200). 10 walkable peristalsis-ring platforms at exactly 450px vertical spacing. Fiber token sits on the middle ring.
- **Telegraph window is large** (520px = ~1.36s warning at wave speed 360) so the inward squeeze is gradual and readable.

### Story / cut scenes

- **Crispy talks.** Earlier draft used thought bubbles because he has no mouth. CJ's call: he speaks anyway, with normal speech bubbles. It's cartoony — don't sweat the anatomy.
- **Crispy's opening line is "Oh no."** Not "Dang it." Reason: "Dang it" implied he knew what was about to happen. "Oh no" is scared and naive — he just knows it can't be good.
- **The Stomach Acid Blob has a mouth.** A big jagged mouth full of acid teeth that opens when he roars. Earlier draft mistakenly said he had no mouth.
- **"Censored" means pixel mosaic.** Chunky low-res pixel squares covering the shape. Not blur, not swirls, not smoke. Both the kid's backside and the toilet poops in the ending use this treatment.
- **Final ending panel has no dialogue.** Crispy's face does all the work. (Earlier draft had a "...heck." line — removed.)
- **Bosses confirmed (3):** Tongue (mouth, aggressive + confused), Stomach Acid Blob (stomach, Hulk rage), Poop Boss (anus final obstacle, lazy). Esophagus / small intestine / large intestine have no bosses — pure platforming.
- **Five cut scenes total:** opening ("Lift Off"), Tongue intro, Stomach Acid Blob intro, Poop Boss intro, toilet ending ("Splashdown").

### Mechanics

- **Poop Boss mechanic:** stomp him **3 times** to make him grudgingly roll off the exit tile. Stomps don't kill him. After he relocates, Crispy waits for the next fart event on the now-unblocked exit tile.
- **No bosses in esophagus, small intestine, or large intestine.** Those rooms are pure platforming. (If you were planning to add one — don't.)

### Tech / hosting

- **Leaderboards: Cloudflare Workers + KV.** Three boards total. KV's last-write-wins is acceptable at 50-student scale. We considered D1/SQL and rejected it as overkill.
- **GitHub:** `github.com/deerffej305/cheerio-quest` — personal project, not organizational.
- **JavaScript, not TypeScript.** Keep it simple for now.

---

## Open questions / things to flag

- **Quiz question source.** Until CJ's class delivers 100 real questions, use placeholders. Schema is documented in GAME_DESIGN.md §7. Don't hard-code questions inside scenes — load from `src/data/questions.json`.
- **Cut scene panel images.** Until Phase 7, use labeled placeholder boxes ("PANEL 1," "PANEL 2") so the cut scene system can be built and tested without real art. Real PNGs drop into `public/assets/cutscenes/` later.
- **Cheerio sprite.** Placeholder is a yellow ring (donut shape) until the art pass.
- **Touch controls.** Build the on-screen D-pad now, but test only briefly — quiz answers also need touch. Jeff will likely have a Surface available to verify the D-pad feels right.

---

## What Cowork is on the hook for next

When Jeff returns to Cowork, expected work:

1. **Art pass.** Generating or coordinating Crispy sprite, room backgrounds, boss illustrations, and the five cut scene panel sets. Probably the next thing.
2. **UX-copy review** on the on-screen fiber bonus label, win/lose screens, and name-entry prompt.
3. **Accessibility review** before classroom playtest (color contrast on a projector, font sizes).

---

## Workflow ground rules

- **Design changes go in Cowork**, then GAME_DESIGN.md or STORY.md is updated, then this file is updated, then you re-read.
- **Code decisions you make on the fly** — log them briefly in `DECISIONS.md` (create it if it doesn't exist). Jeff will review and override if needed.
- **Don't add new bosses, new rooms, or new mechanics** without going through Jeff. If something feels missing during the build, flag it instead of inventing.
- **Don't generate placeholder art that looks final.** Keep placeholders obvious (solid colors, labels) so nobody mistakes them for real assets.

---

*Update this file at the end of every Cowork session. Keep the "Most recent design decisions" section near the top so deltas are easy to spot.*
