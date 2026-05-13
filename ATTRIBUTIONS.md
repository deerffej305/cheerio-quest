# Attributions

Per the design doc §10, audio is sourced from OpenGameArt.org,
Kenney.nl, and Freesound.org under CC0 / CC-BY licenses. This
file tracks attribution as those samples land.

## Audio

| File | Source | License | Notes |
| --- | --- | --- | --- |
| `public/assets/audio/jump.wav` | Own synthesis | CC0 | Baked from procedural recipe in `src/systems/SoundManager.js`. Square-wave envelope 220→600 Hz. To be replaced with recorded SFX from Cowork. |
| `public/assets/audio/stomp.wav` | Own synthesis | CC0 | Procedural recipe. Square-wave envelope 320→80 Hz. |
| `public/assets/audio/damage.wav` | Own synthesis | CC0 | Procedural recipe. Noise burst. |
| `public/assets/audio/score.wav` | Own synthesis | CC0 | Procedural recipe. Triangle wave 880→1320 Hz. |
| `public/assets/audio/fiber.wav` | Own synthesis | CC0 | Procedural recipe. Two-note triangle chirp. |
| `public/assets/audio/death.wav` | Own synthesis | CC0 | Procedural recipe. Slow descending saw. |
| `public/assets/audio/room-clear.wav` | Own synthesis | CC0 | Procedural recipe. Three-note ascending triangle. |
| `public/assets/audio/fart.wav` | Own synthesis | CC0 | Procedural recipe. Low blat + noise. |

All current audio is synthesized in-house (see
`scripts/gen-audio.js`) and released as CC0 / public domain.

## Art

Pending Phase 7. All current sprites and backgrounds are
procedural placeholders (yellow ring for Crispy, colored
rectangles for enemies, labeled boxes for cut-scene panels).
Real PNGs from Cowork will be attributed here when they land.

## Code

Phaser 3 — MIT.
Vite — MIT.
Cloudflare Wrangler — Apache-2.0.

---

*Update this file every time a new asset is added.*
