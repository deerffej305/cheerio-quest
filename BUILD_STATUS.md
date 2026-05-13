# Build Status — where we are

**Last updated:** 2026-05-12 (Cowork session with Jeff and CJ)

This is a rolling status document. Read it after `CLAUDE.md`, `GAME_DESIGN.md`, and `STORY.md` to get the current picture. Jeff updates it after Cowork sessions so Claude Code stays in sync.

---

## Where the project stands

| Area | Status |
| --- | --- |
| **Design (Game Design Document)** | ✅ Complete and locked. See `GAME_DESIGN.md`. |
| **Story + cut scenes** | ✅ Complete and locked. Five comic-storyboard cut scenes drafted, with CJ's revisions applied. See `STORY.md`. |
| **Phase 1–2 — Scaffold + Mouth room** | 🛠️ In progress. Mechanics work has begun. |
| **Phase 3–4 — Quiz UI + remaining rooms** | ⏳ Pending. |
| **Phase 5–6 — Leaderboards + Quiz Mode** | ⏳ Pending. |
| **Phase 7 — Art pass** | ⏳ Pending. Will come back to Cowork (very soon, per Jeff). |
| **Phase 8 — Audio pass** | ⏳ Pending. |
| **Phase 9 — Polish + accessibility** | ⏳ Pending. |
| **Phase 10 — Deploy** | ⏳ Pending. |
| **Quiz bank (100 questions)** | ⏳ Awaiting CJ's class. Use ~15–20 placeholder questions in `src/data/questions.json` for testing. |

---

## Most recent design decisions (apply these)

These were locked in during the latest Cowork session. Some override earlier assumptions.

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
