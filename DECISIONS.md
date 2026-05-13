# DECISIONS

Per the workflow rules in `BUILD_STATUS.md`: small code decisions
Claude makes on the fly land here. Jeff reviews and can override.
Big design changes still go through Cowork → `GAME_DESIGN.md` /
`STORY.md` → `BUILD_STATUS.md`, not here.

---

## 2026-05-12 — Aligning the build to the new Cowork docs

Cowork docs arrived after the grey-box of all six rooms was
already built. Differences and how they were resolved:

- **C. difficile mini-boss was built in the Large Intestine.**
  Cowork doc explicitly says "No bosses in esophagus, small
  intestine, or large intestine." Removed the boss entirely. The
  C. diff blob entity file stays in `src/entities/enemies/` for
  now (zero references) — Jeff can delete it if he wants to keep
  the tree clean.
- **Cheerio character name → "Crispy"** in user-facing strings
  (HUD label, prompts, flash messages). The class / file names
  (`Cheerio.js`, `class Cheerio`) stay as the code-level
  identifier; renaming the class everywhere would touch every
  scene and isn't worth the churn for an internal name.
- **Cheerio sprite placeholder** is currently a rectangle. New
  doc says "yellow ring (donut shape) until the art pass."
  Swapped the visual to a yellow ring drawn with a Phaser
  Graphics + generated texture so it works as a normal sprite
  with a physics body.
- **Stomach Acid Blob boss** in the Stomach: previously a passive
  acid bubble that retreated when a pyloric switch was hit. Per
  the new doc (and STORY.md), the blob is an active boss with a
  jagged mouth that opens when he roars. Reworked as a 3-stomp
  boss.
- **Poop Boss in the Anus** replaces the loose "10 patrol
  displacers + 3 static blockers" pile. New mechanic: stomp him
  3 times, he grudgingly rolls off the exit tile (doesn't die),
  then Crispy waits for the next fart on the unblocked tile.
- **Cut scenes:** existing system was a single generic placeholder
  fired between every room. New design specifies five specific
  named cut scenes (Lift Off, Tongue intro, Stomach Acid Blob
  intro, Poop Boss intro, Splashdown) at specific trigger points.
  Reworked the scene to accept a `key` and render labeled panel
  boxes (`PANEL 1`, `PANEL 2`) until real PNGs land in
  `public/assets/cutscenes/`.

## Open items flagged for Jeff

- **`STORY.md` is referenced everywhere but not yet committed to
  the repo.** I built cut-scene placeholders without the actual
  story beats; the placeholders just say `PANEL 1` etc. When
  STORY.md lands I'll plumb the panel counts and labels through.
- **`CLAUDE.md` is referenced in BUILD_STATUS.md but also not yet
  committed.** Add when ready.
- ~~**`tongue` and `blob` cutscene intros are not yet wired.**~~
  RESOLVED 2026-05-12: Jeff picked option B (mid-room pause +
  overlay). Triggers fire once per room run when the cheerio
  crosses an x threshold (1500 in Mouth, 1200 in Stomach).
- ~~**Unreferenced entity files**~~ DELETED 2026-05-12:
  `enemies/CDiffBlob.js`, `enemies/PoopDisplacer.js`,
  `hazards/ConstipationBlocker.js`.

## 2026-05-12 (cont.) — Story-alignment fixes

- **Poop Boss first-fart timer = 30s.** STORY.md panel 5 of the
  Poop Boss cutscene shows "FART IN 30 SECONDS" — that 30-second
  window is the player's designed time to stomp the boss off the
  tile and position for the launch. `RoomAnus.startFartCycle`
  now uses a hard 30s for the FIRST fart only; subsequent farts
  fall back to the fiber-modulated standard period.
- **Splashdown panel 6 = the credits/score recap.** Merged the
  ending: `CutsceneScene.advance()` now accepts a
  `submitOnAdvance` flag that runs the name-prompt + leaderboard
  POSTs (points + correct) before exiting to Title. The old
  `RoomAnus.showCredits()` flow is kept as a fallback for the
  pause-menu "Quit to Title" path but no longer auto-submits.
- **Audio stays procedural.** CLAUDE.md says "silent placeholders"
  but Jeff confirmed in chat to keep the procedural beeps until
  the real CC0 samples land in Phase 8.

## 2026-05-12 (cont. 2) — Phase 8 audio pipeline

- **Bundled .wav audio with procedural-recipe fallback.** Phase 8
  expects real recorded audio from Cowork. To get the asset
  pipeline in place TODAY without blocking on Cowork, I added
  `scripts/gen-audio.js` which bakes the same procedural recipes
  from `SoundManager.js` into eight 22 kHz mono PCM WAVs in
  `public/assets/audio/` (jump, stomp, damage, score, fiber,
  death, room-clear, fart). BootScene preloads them, and
  `SoundManager.play(key)` prefers `game.sound.play(key)` when
  the cache has the key, falling back to the runtime procedural
  synth if not. Net effect: when Cowork drops real recorded
  WAVs at the same paths, no code changes; just regenerate the
  bundle.
- Created `ATTRIBUTIONS.md` to track audio + art sources. All
  current audio attributed to "own synthesis, CC0".
