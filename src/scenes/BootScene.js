import Phaser from 'phaser';
import { sound } from '../systems/SoundManager.js';

// Boot scene runs once at startup. Two jobs:
//   1. Generate placeholder ring textures for Crispy (real PNG
//      sprites land in Phase 7).
//   2. Preload the Phase 8 SFX bank as .wav files. SoundManager
//      will prefer the loaded Phaser sample over the procedural
//      fallback whenever a key exists in the audio cache.
//
// The .wav files in public/assets/audio/ are currently baked
// from the same procedural recipes (see scripts/gen-audio.js);
// real recorded audio from Cowork drops in at the same paths.
const SFX_KEYS = ['jump', 'stomp', 'damage', 'score', 'fiber', 'death', 'room-clear', 'fart'];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    for (const key of SFX_KEYS) {
      this.load.audio(key, `assets/audio/${key}.wav`);
    }
  }

  create() {
    this.makeRingTexture('crispy-big', 48, 8);
    this.makeRingTexture('crispy-small', 28, 5);
    // Hand SoundManager a scene so it can route play(key) to the
    // loaded Phaser audio samples when they exist in cache.
    sound.attachPhaserScene(this);
    this.scene.start('Title');
  }

  // A yellow donut: outlined circle of the given outer size and
  // ring thickness. Origin is the texture's top-left so it composes
  // cleanly with arcade physics bodies.
  makeRingTexture(key, size, ringWidth) {
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(ringWidth, 0xffd040);
    g.strokeCircle(size / 2, size / 2, size / 2 - ringWidth / 2);
    // A subtle darker outline so the ring reads against pink/red rooms.
    g.lineStyle(2, 0xc09020);
    g.strokeCircle(size / 2, size / 2, size / 2 - ringWidth / 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
