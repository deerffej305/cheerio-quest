# Journey to the Center of the Anus

**A 2D platformer through the human digestive system**

Working title. Repo name: `cheerio-quest`.
Designed by Jeff Reed and son. Built for a 9th-grade biology class.

---

## 1. Overview

**What it is.** A browser-based 2D platformer. The player controls a Cheerio with arms, legs, and eyes (no mouth) on a journey through the human digestive tract — from the spoon that feeds it to the toilet bowl at the other end. Six rooms, one per major organ. Each room ends in a quiz that doubles as a class assessment.

**Audience.** 9th-grade biology students. The game must be polished enough to play on a projector in front of a class, simple enough for a student to pick up in one minute, and accurate enough that the bio teacher would approve. Tone is "wacky cartoon meets educational" — funny, but informative.

**Platform.** HTML5 / Phaser 3, delivered as a static web app. Plays on any modern browser, optimized for Microsoft Surface tablets in laptop or tablet mode.

**Hosting.** Cloudflare Pages for the game itself. Cloudflare Workers + KV for shared leaderboards. Custom domain attached later.

**Resolution.** 1280×720 (16:9), scaled responsively to fill the browser.

---

## 2. Player character

**The Cheerio.** A whole-oat ring with two eyes, two arms, and two legs. No mouth. Hand-drawn cartoon style.

**Two states:**

- **Big Cheerio** — starting state. Can take one hit before shrinking. Can break fiber-brick walls. Jumps 50% higher than Small.
- **Small Cheerio** — vulnerable. One hit and it's room-restart with a point penalty.

**State transitions:**

- **Big + hit → Small.** No point loss. Just shrinks.
- **Small + hit → restart room, −20 points.**
- **Small + fiber token → Big.**
- **Big + fiber token → +10 points** (you don't double-grow; you bank the token as score).

There is one fiber token per room.

---

## 3. Controls

**Keyboard (primary):**

- Left / Right arrows or A / D — move
- Spacebar, Up arrow, or W — jump
- Esc — pause

**Touchscreen (Surface tablet mode, secondary):**

- On-screen D-pad cross (Up / Down / Left / Right). Jump on Up.
- Touch + keyboard both supported in quiz UI.

Gameplay is keyboard-first by intent. Touch is a fallback so a kid with a detached Surface keyboard isn't locked out.

---

## 4. Core mechanics

**Movement.** Run + jump only. No double jump. No dash. Gravity is Mario-feeling — heavier on descent than ascent, with a "coyote time" window for forgiving edge jumps.

**Combat / damage.** The Cheerio is mostly defenseless. Its only offensive option is the **stomp**: jumping on top of an enemy damages it. Stompable enemies die in one hit (except bosses). Non-stompable enemies must be avoided.

| Enemy / hazard | Stompable? | Damage to player on contact |
| --- | --- | --- |
| Cavity bacteria (mouth) | Yes | Yes |
| Tongue boss (mouth) | Yes (on lunge) | Indirect — pushes you into teeth |
| Chomping teeth (mouth) | No | Yes |
| Peristalsis rings (esophagus) | No | Yes |
| Acid drops (stomach) | Yes (+5 pts) | Yes |
| Acid balls (stomach) | **No** | Yes |
| Acid pits (stomach) | N/A | Instant restart (lava rule) |
| Villi (small intestine) | Yes | Yes |
| Microvilli (small intestine) | **No** | Yes |
| Off-screen (small intestine) | N/A | Instant restart |
| Bad bacteria (large intestine) | Yes | Yes |
| Good bacteria (large intestine) | N/A | None — collectible, +5 pts |
| Poop / constipation blockers (anus) | No | Displaces only — no damage |

**Death.** No lives system. Every death just restarts the current room with a −20 point penalty. The current room's progress (questions answered) is lost but the player keeps their score from prior rooms.

**Fiber bonus mechanic.** Every fiber token collected across the run feeds into the anus room: more fiber → faster fart cycles → easier exit. An on-screen educational label appears when this bonus activates, teaching the student why fiber matters. *(The entire game is justifying the biological principle that fiber helps you poop.)*

---

## 5. Game modes

### Game Mode (Arcade)

Full play-through, mouth to anus. Six rooms back to back. End-of-room quiz of 10 questions before the next room unlocks. Two leaderboards record results: **Most Points** and **Most Questions Correct**.

A "round" = one full play-through. Within a round, the same quiz question cannot appear twice. Across rounds, repeats are allowed.

### Quiz Mode

Pure assessment mode — no platforming. Pulls random questions from the 100-question bank one at a time. Continues until the player answers one wrong. Records **Highest Streak** to a third leaderboard.

---

## 6. Room designs

### Room 1 — Mouth

**Setup.** Player starts on a spoon. The spoon lifts the Cheerio toward the open mouth (intro animation, doubles as the controls tutorial). Cheerio jumps off the spoon into the mouth.

**Hazards & enemies.**

- **Cavity bacteria** patrol the teeth, walking back and forth. Stompable.
- **Saliva drips** create slippery floor patches.
- **Taste-bud platforms** with sweet / sour / salty / bitter colors (purely cosmetic).
- **Chomping teeth** at the front of the mouth — a periodic clamp. The player must NOT be in the teeth zone when the chomp fires.

**Boss — The Tongue.** Anchored at the back-right of the mouth. The base of the tongue doesn't move. Periodically the tongue lunges forward, sweeping toward the left. If the player is on the tongue when it lunges, they are pushed left toward the chomping teeth — getting caught in a chomp is what damages them (not the tongue itself). The player's only response: **jump onto the lunging tongue**. Each successful stomp recoils the tongue and counts as a hit. **Four hits and the tongue slouches** — no longer blocks the path, no longer attacks. The player runs **over** the slouched tongue to reach the back of the mouth.

**Exit.** Back-of-mouth swallow leads to the esophagus.

**Fiber token location.** Hidden in or behind a back molar.

### Room 2 — Esophagus

**Setup.** A vertical drop tower. Cheerio falls. Goal: reach the bottom quickly. No anthropomorphization here — the rings are anatomical, no eyes or faces.

**Hazards.**

- **Peristalsis contraction rings** travel upward through the tube. If a contraction reaches the Cheerio, it squeezes — damage.
- **Mucus stream patches** along the wall = speed boost. Slide down faster.
- **Branching folds** offer two paths: a main lumen (safer) and tighter folds (riskier, hide bonus oat-bits and the fiber token).
- **Burp event** — on a timer. If the player has been in the room too long, a burp wave pushes them upward briefly, costing time.

**No boss.** The whole level is a vertical gauntlet.

**Exit.** Bottom of the tube opens into the stomach.

### Room 3 — Stomach

**Setup.** The largest, longest room in the game. The stomach is a cavernous space with acid at the bottom and pieces of food floating above it as platforms.

**Hazards & enemies.**

- **Acid pits.** Falling into one is instant restart — even when Big.
- **Acid drops** patrol the food platforms — Goomba analogs. Stompable for **+5 points each**.
- **Acid balls** rise out of the acid like Mario podoboos, telegraphed by a bubble. Not stompable.
- **Food platforms** slowly dissolve when stood on too long. The Cheerio must keep moving.

**Mini-boss (optional, scope permitting).** A giant acid bubble at the exit that requires triggering the pyloric sphincter to open.

**Exit.** Pyloric sphincter at the right of the room.

**Fiber token location.** On a platform near the acid floor — risky to reach.

### Room 4 — Small Intestine

**Setup.** Auto-scroller. The screen scrolls right at a fixed speed; the Cheerio must keep up. Obstacles arrive from the right.

**Hazards.**

- **Villi** — large wavy tentacles that whip across the play area as obstacles. Stompable.
- **Microvilli** — small spike clusters lining the floor and ceiling. Not stompable; contact = damage.
- **Bile injection from the pancreas** — a screen-wide hazard the player must duck under. Telegraphed by a rumble.
- **Off-screen = instant restart.** If the player is pushed off the left edge of the screen by an obstacle, they die even when Big.

**Bonus collectibles.** 5–10 **nutrient orbs** scattered along the path, each worth +5 points. Risk-reward — chasing them pulls the player toward danger.

**Speed curve.** Starts at 1.0× and ramps to ~1.5× near the exit.

**Exit.** Ileocecal valve at the end of the path.

### Room 5 — Large Intestine

**Setup.** Default platforming returns. Twisting fold-corridor terrain — labyrinth-like.

**Hazards & enemies.**

- **Bad bacteria** (red — *E. coli* O157, *C. difficile*) patrol as standard enemies. Stompable.
- **Good bacteria** (green — *Lactobacillus*, *Bifidobacterium*) float as collectibles. +5 points each.
- **Water-reabsorption tiles.** Some platforms slowly shrink underfoot as the colon does its job. Don't linger.
- **Methane gas pockets** act as bouncy platforms — fart-bubble bouncers.
- **Fiber-brick walls** can only be broken by Big Cheerio. Hide secret rooms with bonus points and the room's fiber token.

**Mini-boss (optional, scope permitting).** A *C. diff*-themed blob boss at the haustra that splits into smaller blobs Mario-style.

**Exit.** Sigmoid colon transitions into the rectum.

### Room 6 — Anus (The Constipation Maze)

**Setup.** A maze of constipation. The player must navigate to the single **exit tile** at the sphincter when a **fart event** fires.

**Mechanics.**

- **Fart timer.** A periodic on-screen rumble + countdown warns of an incoming fart (3-2-1).
- **One exit tile.** When the fart fires, only the player standing on the exit tile is launched out — completing the game.
- **Missing the fart.** If the player isn't on the exit tile, poop / displacement enemies push them aside. **No damage, just displacement.** They scramble to recover and wait for the next fart.
- **Constipation blockers.** Stool piles partially block paths. Some can be pushed, some require climbing.
- **Fiber bonus.** The more fiber tokens collected across all rooms, the more frequently fart events fire. An on-screen educational label explains this when the bonus is active.

**Exit / Ending.** Successful fart launch = Cheerio is fired into a triumphant freeze-frame in a toilet bowl. Roll credits. Show final score and run stats.

---

## 7. Quiz system

**Bank size.** 100 questions, written by your son's class group project.

**Question schema (proposed):**

```json
{
  "id": 1,
  "question": "What enzyme in saliva begins the digestion of starches?",
  "options": ["Pepsin", "Amylase", "Lipase", "Trypsin"],
  "correctAnswerIndex": 1,
  "room": "mouth",
  "difficulty": "easy"
}
```

The `room` tag has seven possible values: `mouth`, `esophagus`, `stomach`, `small_intestine`, `large_intestine`, `anus`, `general` (for liver, kidneys, pancreas, and any non-organ questions).

**Game Mode pull logic.** Each end-of-room quiz pulls 10 questions:
1. First fill from the matching `room` tag (e.g., Mouth quiz pulls `room == "mouth"` first).
2. If that tag has fewer than 10 unused questions, fall back to `room == "general"`.
3. If still short, fall back to any unused questions in the bank.
4. No question repeats within a single round (one full play-through).

**Quiz Mode pull logic.** Random draws from the full 100-question pool. No room filtering. No repeats during the run. Sudden death — first wrong answer ends the run.

**Scoring.**

- Correct: **+10 points** (Game Mode) or +1 streak (Quiz Mode).
- Wrong: **−5 points** (Game Mode) or streak resets to 0 (Quiz Mode).
- Player must attempt all 10 questions to exit a room in Game Mode (no skipping).

**Quiz UI.** Multiple choice, four options per question. Touch and keyboard both supported. Number keys 1–4 select answers via keyboard.

---

## 8. Leaderboards

Three leaderboards, all stored in Cloudflare KV:

1. **Game Mode — Most Points** (highest total score across a full play-through).
2. **Game Mode — Most Questions Correct** (highest count of correct answers in a full play-through).
3. **Quiz Mode — Highest Streak** (longest run of correct answers in Quiz Mode).

**Entry submission.** At end of a run, the player enters a name (15-character cap) and the score posts to the relevant leaderboard.

**Display.** All three leaderboards visible on the start screen, top 10 per board. Optional: a "Recent Scores" view for quick refreshes during class.

**Backend.** Cloudflare Worker exposes two endpoints — `GET /leaderboard?board=points|correct|streak` and `POST /leaderboard` (rate-limited). Each board stored as one JSON blob in KV; reads/writes are atomic on the blob.

---

## 9. Art direction

**Style.** Hand-drawn cartoon. Cheerio is the visual anchor — friendly face, expressive eyes, no mouth. Backgrounds are stylized organs: pink, slimy, exaggerated, with cartoon-textured walls.

**Color palette.**

- Mouth — pink/red with white teeth highlights
- Esophagus — deeper red with mucus shimmer
- Stomach — orange-red acid, brown food platforms
- Small Intestine — pink-orange with green bile accents
- Large Intestine — brown/tan with bacteria color accents (red/green)
- Anus — earth tones, deep brown

**Asset pipeline.** Claude generates initial sprites and backgrounds as PNGs. Iterate from there.

---

## 10. Audio direction

**Style.** Cartoony, royalty-free. Boings, splats, slurps, farts.

**Sound categories:**

- Jump SFX, stomp SFX, landing thud
- Take-damage SFX (Mario-style "ouch"), shrink SFX
- Power-up SFX (fiber token collect)
- Score chime (orb collect, correct answer)
- Wrong-answer buzzer
- Room-themed ambient loops (gurgles, squelches, low rumbles)
- Boss roar (tongue lunge)
- Fart SFX (multiple variations for the anus room)
- Triumphant ending sting

**Sources.** OpenGameArt.org, Kenney.nl, Freesound.org under CC0 / CC-BY licenses. Attribution file maintained in the repo.

---

## 11. Tech stack & project structure

**Engine.** Phaser 3 (latest stable).
**Language.** JavaScript (or TypeScript — to be decided at scaffold time).
**Build tool.** Vite.
**Hosting.** Cloudflare Pages (static frontend) + Cloudflare Workers + KV (leaderboard backend).
**Repo.** `github.com/deerffej305/cheerio-quest`. Personal project.

**Proposed directory layout:**

```
cheerio-quest/
├── public/
│   └── assets/         (sprites, backgrounds, audio)
├── src/
│   ├── main.js         (Phaser entry point + config)
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── TitleScene.js
│   │   ├── GameModeScene.js
│   │   ├── QuizModeScene.js
│   │   ├── RoomMouth.js
│   │   ├── RoomEsophagus.js
│   │   ├── RoomStomach.js
│   │   ├── RoomSmallIntestine.js
│   │   ├── RoomLargeIntestine.js
│   │   ├── RoomAnus.js
│   │   ├── QuizScene.js          (shared end-of-room quiz)
│   │   └── LeaderboardScene.js
│   ├── entities/
│   │   ├── Cheerio.js
│   │   ├── enemies/    (one file per enemy type)
│   │   └── hazards/
│   ├── systems/
│   │   ├── ScoreManager.js
│   │   ├── QuestionBank.js
│   │   ├── LeaderboardClient.js  (talks to Cloudflare Worker)
│   │   └── InputManager.js       (keyboard + touch)
│   └── data/
│       └── questions.json        (the 100 questions, room-tagged)
├── worker/
│   └── leaderboard.js  (Cloudflare Worker source)
├── index.html
├── package.json
├── vite.config.js
└── GAME_DESIGN.md (this file)
```

---

## 12. Build phases

1. **Phase 0 — Game Design Doc** (this file). ✅
2. **Phase 1 — Scaffold.** Phaser + Vite project, scene structure, placeholder rectangles. Working keyboard input. Score HUD.
3. **Phase 2 — Mouth room grey-box.** Spoon intro, tongue boss with 4-hit health, chomping teeth, fiber token, win condition. All rectangles, no art yet.
4. **Phase 3 — Quiz UI + end-of-room flow.** Mock question bank of ~20 questions. Quiz pulls correctly, scoring works.
5. **Phase 4 — Remaining 5 rooms grey-box.** Each room playable with placeholder shapes.
6. **Phase 5 — Leaderboards** (Cloudflare Worker + KV). Start screen with three leaderboards. Name entry.
7. **Phase 6 — Quiz Mode.** Separate scene, sudden-death flow, streak leaderboard.
8. **Phase 7 — Art pass.** Generate Cheerio sprite + room backgrounds + enemy art. Replace rectangles.
9. **Phase 8 — Audio pass.** Source and integrate royalty-free SFX + ambient loops.
10. **Phase 9 — Polish.** Death animations, transitions, easing, accessibility check (color contrast for projector, font size), playtest with real student.
11. **Phase 10 — Deploy.** Cloudflare Pages + custom domain.

Phases 1–4 are the core "is this fun?" milestone. Phases 7–9 are the polish needed before the class plays it.

---

## 13. Open questions / future work

- **Difficulty calibration.** First playtest with a real 9th-grader will reveal whether jumps are too tight, the auto-scroller is too fast, etc.
- **Saving progress between sessions.** Currently no save — every run starts fresh. Could be added later if needed.
- **Pause menu.** Minimal pause overlay; settings menu deferred.
- **Mobile / phone support.** Out of scope; targeting Surface and projector.
- **Localization.** English only for v1.
- **Death animations.** Cheerio dissolving in acid is comedy gold but a polish-phase item.

---

*Last updated by Claude in conversation with Jeff. Live document — update as decisions evolve.*
