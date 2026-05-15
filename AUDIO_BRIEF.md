# Audio Brief — Cheerio Quest (Phase 8 sound pass)

A drop-in spec for Cowork to record the 10 sound effects that
replace the procedural Web-Audio placeholders. Paired with
[ART_BRIEF.md](./ART_BRIEF.md), [GAME_DESIGN.md](./GAME_DESIGN.md),
and [STORY.md](./STORY.md) — read those first for full context.

---

## TL;DR

We need 10 short SFX, **mono 22050 Hz 16-bit WAV**, dropped into
`public/assets/audio/` under the exact filenames below. The game
code already knows how to find them — no wiring changes from
Cowork's side.

Right now those 10 .wav files exist already, but they're baked from
the procedural beep recipes in `scripts/gen-audio.js`. Drop in real
recordings at the same paths and rebuild — the loaded sample beats
the procedural fallback automatically.

---

## Style

- **Cartoony.** Same energy as the art brief — Cartoon Network, not
  realistic. Cheesy is good. Squelchy is good.
- **Short.** Most cues are 80–500 ms. Nothing over a second.
- **Punchy.** Each sound is a single event, not a tail. No reverb /
  ambience needed — the game has no music layer to compete with.
- **Mouth-noises welcome.** Most of these are inside a body. Wet,
  squishy, organic sounds beat synthesized whooshes for most cues.
- **Mono is fine.** Sound output is positional via Phaser scenes,
  not stereo panning.

---

## The 10 sounds

Listed by key. The "key" is the literal filename (no extension). The
"current placeholder" column tells you what the procedural synth
currently produces — useful as a sanity check on duration and
character, not as a target to imitate exactly.

| # | Key (filename) | What it plays for | Current placeholder | Target feel |
|---|---|---|---|---|
| 1 | `jump.wav` | Crispy jumps (any room) | square wave 220→600 Hz, 100 ms | Quick "boing" / "hup". Could be a tiny vocal "hup" or a cartoony spring. |
| 2 | `stomp.wav` | Crispy lands on a boss / enemy from above (Tongue, Acid Blob, Poop Boss) | square 320→80 Hz, 80 ms | Wet thump. A muffled "splat." Hitting a flan, not concrete. |
| 3 | `damage.wav` | Crispy gets hit and shrinks (any room) | noise burst, 160 ms | Sharp "ow!" or a brittle crack. Cereal-being-bitten energy. |
| 4 | `score.wav` | Generic positive feedback — quiz correct, exit unlock, etc. | triangle 880→1320 Hz, 120 ms | Bright ding. Two-note up-arpeggio. Pleasant. |
| 5 | `fiber.wav` | Fiber token pickup (every room) | triangle double-arpeggio, ~240 ms | Slightly more triumphant than `score`. Two-note rising chirp. The "you got the thing" sound. |
| 6 | `death.wav` | Crispy dies (any cause — saliva, acid, peristalsis crunch, etc.) | sawtooth 440→80 Hz, 450 ms linear | Cartoon descending sad-trombone, or a wet "blorp" deflating. Should feel like defeat, not horror — it's a cereal hero in a kid's stomach. |
| 7 | `room-clear.wav` | Room completed, before quiz starts | triangle ascending three-note, 500 ms | Three-note major-chord fanfare. Brief and cheerful. |
| 8 | `fart.wav` | Burp in Esophagus / fart launch in Anus | sawtooth + noise, 300 ms | Self-explanatory. Wet, low, brief. Anus version can be slightly more triumphant if you want two variants — but one file is fine. |
| 9 | `crunch.wav` | A peristalsis muscle segment locks shut in the Esophagus | square 180→50 Hz + noise burst, 100 ms | Wet THUD. Muscle clamping. Lower and shorter than `damage` — it's the wall closing, not Crispy hurting. Plays repeatedly as the wave descends, so it has to not be annoying on the 30th repetition. |
| 10 | `squelch.wav` | A peristalsis muscle segment starts squeezing (telegraph phase, just before `crunch`) | sawtooth 90→220 Hz, 180 ms | Wet rising squeeze. Tension. Pairs with `crunch` — `squelch` is the warning, `crunch` is the impact. Also plays many times during a fall, so keep it un-tiring. |

---

## File format details

- **Sample rate:** 22050 Hz (game's procedural pipeline runs at this rate; higher rates work but inflate the bundle).
- **Bit depth:** 16-bit signed PCM.
- **Channels:** Mono (1 channel).
- **Container:** RIFF/WAV (`.wav`).
- **Loudness:** Roughly −12 dB peak; the game has a soft gain compressor in `SoundManager.js` so leave headroom.
- **Filename:** EXACTLY the key in the table above + `.wav` (lowercase, no spaces, includes the hyphen in `room-clear.wav`).

If you've got higher-fidelity source files (44.1k stereo), that's
fine — just down-sample/down-mix on export. We don't need the
fidelity since most playback will be through laptop / projector
speakers in a classroom.

---

## How to replace a sound

1. Save the new file at `public/assets/audio/<key>.wav`, overwriting
   the placeholder.
2. Rebuild (`npm run build`) — Vite picks up the new asset, no code
   change needed.
3. Test in a browser: hit the relevant in-game event. The loaded
   sample plays instead of the procedural fallback.

If you skip any of the 10, the procedural beep keeps playing for
that key. So Cowork can ship a partial batch and the game still
works.

---

## Open notes

- **No music.** GAME_DESIGN.md never spec'd a music layer. If
  Cowork wants to add a single looping background track per room,
  flag it to Jeff first — would need new wiring + a volume slider
  separate from the SFX mute.
- **Voice lines.** STORY.md has dialogue ("Oh no.", "RRRRAAAAAAAGH",
  etc.) but those live in the cut-scene panels as text. If Cowork
  wants to record voice, again flag to Jeff — needs a separate
  pipeline and probably a subtitle toggle.
- **Stomp variations.** If Cowork wants slight per-boss variants
  (e.g. `stomp-blob.wav`), let Jeff know and we'll add the key.
  Single `stomp.wav` covers all bosses today.
