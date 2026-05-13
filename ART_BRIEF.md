# Art Brief — Cheerio Quest (Phase 7 art pass)

A drop-in spec for Cowork to generate the art assets needed to
replace the grey-box placeholders in `cheerio-quest`. Paired with
[GAME_DESIGN.md](./GAME_DESIGN.md) and [STORY.md](./STORY.md) —
read those first for full context.

---

## TL;DR

We need:

1. **Crispy** (the cheerio hero) — 1 sprite, 2 sizes (big + small)
2. **3 boss illustrations** — Tongue, Stomach Acid Blob, Poop Boss
3. **~15 enemy / hazard / collectible sprites** — small props
4. **6 room backgrounds** — one per organ
5. **26 cut-scene panels** — across the 5 named cut scenes

Drop the finished PNGs into the file paths listed below. The game
code already knows how to find them — no wiring changes from
Cowork's side.

---

## Style

- **Hand-drawn cartoon.** Friendly, exaggerated, expressive. Think
  Cartoon Network / classic kids cartoon, not pixel art and not
  photorealism.
- **High contrast against the room background** so sprites read
  on a classroom projector from the back row.
- **Crispy's face is the emotional anchor.** Big eyes, simple
  features, lots of expression. He has no mouth but speaks anyway
  via speech bubbles — that's Phaser-rendered text, not part of
  the PNG. So leave room around his face for the bubble.
- **No body horror.** This is a school-appropriate biology demo.
  Goofy, not gross.
- **Censored shapes** (kid's backside, toilet poops in the ending
  panel) get a **pixel-mosaic** treatment per STORY.md — chunky
  low-res colored squares covering the shape. Not blur, not smoke.

### Color palette per room

| Room | Palette |
| --- | --- |
| Mouth | Pink/red with white teeth highlights |
| Esophagus | Deeper red with mucus shimmer |
| Stomach | Orange-red acid, brown food platforms |
| Small Intestine | Pink-orange with green bile accents |
| Large Intestine | Brown/tan with red + green bacteria accents |
| Anus | Earth tones, deep brown |

---

## Tech requirements

- **Format**: PNG with transparency (alpha channel).
- **Resolution**: target the in-game pixel sizes below. 2× upscale is fine if Cowork prefers — Phaser scales down cleanly.
- **Origin**: center-anchored unless noted otherwise.
- **No baked-in shadows or borders** that need to align with surrounding sprites.
- **No text in the PNG.** Dialogue and labels are added by the game engine.
- **File naming**: lowercase, hyphenated, exact filenames listed below. Game code references these literal strings.

---

## File layout for delivered assets

```
public/assets/
├── sprites/
│   ├── crispy-big.png         (48×48 — replaces the yellow ring)
│   ├── crispy-small.png       (28×28)
│   ├── (enemy + hazard sprites, see list below)
│   ...
├── backgrounds/
│   ├── room-mouth.png         (2400×720)
│   ├── room-esophagus.png     (1280×3200)
│   ├── room-stomach.png       (3600×720)
│   ├── room-small-intestine.png (5200×720)
│   ├── room-large-intestine.png (3800×720)
│   └── room-anus.png          (1280×720)
└── cutscenes/
    ├── liftoff-1.png          (800×380 per panel — see panel list)
    ├── liftoff-2.png
    ├── ...
    ├── splashdown-6.png
```

---

## Priority order (ship the MVP set first)

**MVP set — single highest impact:**

1. `crispy-big.png` + `crispy-small.png` — every room shows him; biggest visual win
2. Boss illustrations: `tongue-boss.png`, `stomach-acid-blob.png`, `poop-boss.png`
3. The five cut-scene character beats (panels 2 of liftoff, all of tongue, all of blob, all of poop, panel 3 + 5 of splashdown) — these are where Crispy + bosses emote

**Polish wave 2:**

4. Room backgrounds (organ scenery)
5. Enemy + hazard sprites (cavity bacteria, peristalsis ring, etc.)
6. Remaining cut-scene panels

---

## Character refs

### Crispy (the hero)

- A whole-oat Cheerio with **two eyes, two arms, two legs, no mouth**.
- Bright yellow body. Slightly outlined so he reads against pink/red rooms.
- **Two states** — Big and Small. Same character, smaller version is shrunk to ~58% scale. Same face/pose, just sized down.
- **Big**: 48×48 px in the game. Confident-but-scared base pose.
- **Small**: 28×28 px. Same look at smaller scale.
- **No mouth ever.** Speech bubbles attach to him via the game engine.
- Big eyes do the heavy lifting. He should look scared, brave-by-accident, and just a little bit dorky.

### The Tongue (Mouth boss)

- A massive pink tongue rooted at the back of the mouth.
- **Two big googly eyes** glaring at the player. The tongue is also a mouth piece — it doesn't have its own mouth — but it speaks anyway (speech bubble, not part of PNG).
- Aggressive + a little confused.
- Bonus: a second sprite for the **slouched / defeated** state — same tongue lying flat, eyes droopy.
- Approx size in-game: 500 px wide at full extension, 56 px tall. Cowork can deliver as one wide sprite or as the proximal stub (150 wide) and distal tip (350 wide) separately.

### The Stomach Acid Blob (Stomach boss)

- A giant glob of orange-red stomach acid, roughly 140 wide × 170 tall.
- **Two angry red eyes**.
- **A big jagged mouth full of acid teeth that opens when he roars.** Two sprite states needed: **mouth closed** (idle/walking around) and **mouth wide open + roaring** (vulnerable to stomp).
- Steam rising from his surface — cosmetic.
- Pure Hulk energy. No brain. Just rage.

### The Poop Boss (Anus final obstacle)

- A massive, lumpy brown turd, ~110 wide × 80 tall.
- **Half-closed sleepy eyes**. Chill, lazy expression.
- He's been sitting there for a week and is mildly annoyed at being disturbed.
- Bonus: a second sprite for the **grumpy / rolled-off** state after Crispy stomps him 3 times — he's wedged off to the side, same face but more put-out.

---

## Enemy / hazard / collectible sprites

Pixel sizes listed match the current grey-box. Some flexibility allowed.

### Enemies (stompable patrollers)

| File | Size | Description |
| --- | --- | --- |
| `cavity-bacterium.png` | 30×24 | Mouth enemy. Red blob with little teeth. Patrols. |
| `bad-bacterium.png` | 30×24 | Large Intestine enemy. Darker red, meaner-looking. Slightly more "germ" silhouette than cavity bacteria. |
| `acid-drop.png` | 26×22 | Stomach enemy. Yellow-green acid droplet with a face. Goomba-like. |
| `villus.png` | 26×140 | Small Intestine. A tall wavy pink tentacle rooted at the floor. **Origin: bottom-center** (anchors at base, sways above). |

### Static hazards

| File | Size | Description |
| --- | --- | --- |
| `chomping-tooth-upper.png` | 80×60 | White cartoon tooth, points downward. |
| `chomping-tooth-lower.png` | 80×60 | Same, points upward. |
| `peristalsis-ring-left.png` | variable | Pink-red ring segment. Width varies; cut from a wider strip in code. Provide as one wide segment ~700×28. |
| `peristalsis-ring-right.png` | variable | Mirror of above. |
| `saliva-blob.png` | 70×22 | Pale blue-white wet patch on the floor. Translucent feel. |
| `microvilli-spike.png` | 8×18 | Small green-tan spike. Tiled into clusters in code. |
| `food-platform.png` | 130×18 | Half-dissolved bread/food chunk. Tan-brown. |
| `water-platform.png` | 120×18 | Same but with a "wet/shrinking" vibe. |
| `methane-pocket.png` | 90×26 | Translucent green-gas bubble platform. Subtle. |
| `fiber-brick-wall.png` | 24×80 | Brown brick wall texture, tall and narrow. |
| `acid-ball.png` | 30×30 | Orange podoboo bubble with a face. |

### Collectibles

| File | Size | Description |
| --- | --- | --- |
| `fiber-token.png` | 26×26 | Glowing green diamond. Magical. |
| `nutrient-orb.png` | 16×16 | Small glowing yellow orb. |
| `good-bacterium.png` | 18×18 | Friendly green probiotic blob with a face. |

### Doors / exits / set dressing

| File | Size | Description |
| --- | --- | --- |
| `exit-swallow.png` | 60×120 | Dark mouth/throat opening at the back of the mouth. |
| `exit-pylorus.png` | 60×120 | Pyloric sphincter opening (orange-red ring). |
| `exit-ileocecal.png` | 60×120 | Ileocecal valve (pinkish gate). |
| `exit-sigmoid.png` | 60×120 | Sigmoid colon transition (brown opening). |
| `exit-tile.png` | 80×8 | Glowing green pad — the "stand here for the fart" launch tile. |
| `spoon.png` | 110×24 | Stainless steel spoon — appears in the Mouth intro. |

---

## Room backgrounds

Wide single PNGs for horizontal rooms; tall single PNG for the
Esophagus. The game scrolls a 1280×720 viewport across these.

| File | Size | Notes |
| --- | --- | --- |
| `room-mouth.png` | 2400×720 | Pink interior, taste-bud platforms hint, back-of-mouth darker. |
| `room-esophagus.png` | 1280×3200 | Vertical tube, deep red walls with mucus shimmer. |
| `room-stomach.png` | 3600×720 | Cavernous orange-red. Acid pool baked into the bottom 80 px. |
| `room-small-intestine.png` | 5200×720 | Auto-scroller. Pink-orange tube with subtle green bile streaks. |
| `room-large-intestine.png` | 3800×720 | Brown-tan twisting fold-corridor terrain. |
| `room-anus.png` | 1280×720 | Earth tones, deep brown maze chamber. |

Backgrounds are **scenery only** — platforms, hazards, and the
exit door are drawn on top by the engine. Avoid hard edges where
the engine geometry sits (floor at y=620 in most rooms; tube
walls at x=340 and x=940 in the Esophagus).

---

## Cut-scene panels

Each cut scene plays one panel at a time. The game shows the
panel PNG and overlays the dialogue text below it. So panels do
**not** need baked-in text — just illustration.

**Aspect**: 800×380 fits the current placeholder slot. 2× resolution (1600×760) is fine.

Use the descriptions from [STORY.md](./STORY.md) §Cut Scene N for the full beats. Filenames below match what `CutsceneScene.js` will look for:

### Cut Scene 1 — "Lift Off" (`liftoff-*`)

1. `liftoff-1.png` — Wide shot. Crispy on the spoon, milk drops, mouth shadow looming above.
2. `liftoff-2.png` — Close on Crispy's face. Eyes huge, knees trembling. **Dialogue: "Oh no."**
3. `liftoff-3.png` — POV from inside the mouth, Crispy tiny on the spoon framed by two giant teeth.
4. `liftoff-4.png` — Spoon tilts. Crispy flung off, arms windmilling.
5. `liftoff-5.png` — Cartoon title card. Big lettering: "JOURNEY TO THE CENTER OF THE ANUS — A Crispy Story". This panel CAN have baked-in title text since it's stylized.

### Cut Scene 2 — "The Tongue" (`tongue-*`)

1. `tongue-1.png` — Crispy walking past a row of teeth. Saliva drips.
2. `tongue-2.png` — Floor shakes. Crispy braces himself.
3. `tongue-3.png` — Reveal: arched pink tongue at the back of the mouth, two googly eyes glaring.
4. `tongue-4.png` — Tongue mid-speech. **Dialogue (engine-overlaid)**: "WAIT— what... what ARE you?" / "...doesn't matter. GET CRUSHED, SNACK."
5. `tongue-5.png` — Tongue lunges. Crispy crouches, ready to jump.

### Cut Scene 3 — "ACID" (`blob-*`)

1. `blob-1.png` — Crispy on a half-dissolved bread platform, peering into the acid.
2. `blob-2.png` — Bubbles churning in the acid.
3. `blob-3.png` — Acid blob erupts. Two red eyes, jagged acid-teeth mouth, steam.
4. `blob-4.png` — Blob mid-roar. **Dialogue**: "RRRRAAAAAAAGH"
5. `blob-5.png` — Blob smashes the ground. Acid waves ripple outward.

### Cut Scene 4 — "The Poop Boss" (`poop-*`)

1. `poop-1.png` — Crispy stumbling in, tired, sweat drop, eyes drooping.
2. `poop-2.png` — Turns a corner — massive lumpy turd on the exit tile, sleepy eyes.
3. `poop-3.png` — Poop Boss mid-speech. **Dialogue**: "Ughhh. No rush, man. I've been hangin out here for a WEEK."
4. `poop-4.png` — Crispy. **Dialogue**: "...heck."
5. `poop-5.png` — Walls shake. A countdown indicator on the panel reading "FART IN 30 SECONDS" (this panel CAN have baked-in big stylized text).

### Cut Scene 5 — "Splashdown" (`splashdown-*`)

1. `splashdown-1.png` — WHOOSH lines. Crispy launched.
2. `splashdown-2.png` — Behind Crispy, open sky. Pixel-mosaic-censored kid's backside fading away. (Censor = chunky pixel squares per STORY.md.)
3. `splashdown-3.png` — Crispy from front, eyes closed, smiling. Triumph + relief.
4. `splashdown-4.png` — Pull back. Crispy floats in toilet water. Pixel-mosaic-censored brown blobs around him.
5. `splashdown-5.png` — Crispy opens his eyes. Looks at the blobs. **No dialogue** — his face does the work.
6. `splashdown-6.png` — Optional/skippable: a "THE END" backdrop. The engine overlays the final score, fiber count, and name-entry prompt on top, so the PNG itself can be a simple stylized title-card backdrop without text.

---

## Drop-in instructions for Jeff

When Cowork delivers PNGs:

1. Copy them into `public/assets/sprites/`, `public/assets/backgrounds/`, or `public/assets/cutscenes/` per the filenames above.
2. Commit + push.
3. The game's `BootScene.preload` will be updated in a follow-up PR to load these by key; the relevant `add.rectangle(...)` calls in each scene get swapped for `add.image(...)`. That's a single coordinated commit Jeff can drive once a wave of art lands.

Until that PR, the existing grey-box placeholders continue to ship.

---

## What is NOT needed (don't generate these)

- **HUD / UI text** (score, fiber count, room name) — Phaser-rendered, not images.
- **Title-screen menu buttons** — text-only.
- **Quiz UI** — text-only.
- **Speech bubbles** — Phaser-rendered text. Provide art with room around characters' faces, but no baked-in bubbles.
- **Audio** — Phase 8 (separate asset pass; see ATTRIBUTIONS.md).
- **Spinner / loading icons** — not used.

---

## Open questions to flag back

- Animated sprites vs. single-frame? Current grey-box uses tweens for animation. If Cowork can deliver multi-frame sprite sheets for things like Crispy's run cycle or the Acid Blob's roar, even better — but single-frame static PNGs are fine to start.
- Boss "vulnerable" tells: should the Acid Blob have a third sprite for the "weakened / final HP" state? (Currently we tint his body darker in code on each hit.)
- Cut-scene panel text: should we ever bake text INTO the panels (more comic-book-y) or always engine-overlay? Default plan: engine-overlay everywhere except the stylized title cards (liftoff-5, poop-5, splashdown-6).

---

*Last updated 2026-05-12. Reflects current code state on the `phase-2-mouth` branch.*
