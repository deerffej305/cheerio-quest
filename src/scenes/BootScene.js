import Phaser from 'phaser';
import { sound } from '../systems/SoundManager.js';

// Boot scene runs once at startup. Loads the full art + audio
// manifest per ASSET_WIRE_IN.md. Cowork shipped 33 sprite SVGs,
// 26 cut-scene panel SVGs, 6 room backgrounds, and 10 SFX WAVs.
// Replaces the earlier grey-box ring placeholders and procedural
// audio fallbacks; SoundManager prefers loaded audio when present.

const SFX_KEYS = ['jump', 'stomp', 'damage', 'score', 'fiber', 'death', 'room-clear', 'fart', 'crunch', 'squelch'];

const CUTSCENE_PANELS = [
  'liftoff-1', 'liftoff-2', 'liftoff-3', 'liftoff-4', 'liftoff-5',
  'tongue-1', 'tongue-2', 'tongue-3', 'tongue-4', 'tongue-5',
  'blob-1', 'blob-2', 'blob-3', 'blob-4', 'blob-5',
  'poop-1', 'poop-2', 'poop-3', 'poop-4', 'poop-5',
  'splashdown-1', 'splashdown-2', 'splashdown-3', 'splashdown-4', 'splashdown-5', 'splashdown-6',
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // --- Hero ---
    // Load at native SVG size (256) so larger display sizes (title
    // portrait, cut-scene close-ups) stay crisp. In-game we use
    // setDisplaySize(48 / 28) on the Cheerio sprite to scale down.
    this.load.svg('crispy-big',         'assets/sprites/crispy-big.svg',         { width: 256, height: 256 });
    this.load.svg('crispy-small',       'assets/sprites/crispy-big.svg',         { width: 256, height: 256 });
    this.load.svg('crispy-big-jump',    'assets/sprites/crispy-big-jump.svg',    { width: 256, height: 256 });
    this.load.svg('crispy-small-jump',  'assets/sprites/crispy-big-jump.svg',    { width: 256, height: 256 });

    // --- Bosses ---
    this.load.svg('tongue-boss',                'assets/sprites/tongue-boss.svg',                { width: 220, height: 130 });
    this.load.svg('tongue-boss-lunge',          'assets/sprites/tongue-boss-lunge.svg',          { width: 500, height: 56 });
    this.load.svg('tongue-boss-defeated',       'assets/sprites/tongue-boss-defeated.svg',       { width: 500, height: 56 });
    this.load.svg('stomach-acid-blob',          'assets/sprites/stomach-acid-blob.svg',          { width: 140, height: 170 });
    this.load.svg('stomach-acid-blob-roaring',  'assets/sprites/stomach-acid-blob-roaring.svg',  { width: 140, height: 170 });
    this.load.svg('poop-boss',                  'assets/sprites/poop-boss.svg',                  { width: 110, height: 80 });
    this.load.svg('poop-boss-rolled-off',       'assets/sprites/poop-boss-rolled-off.svg',       { width: 110, height: 80 });

    // --- Enemies (3× per WIRE_IN_FIXES.md) ---
    this.load.svg('cavity-bacterium',  'assets/sprites/cavity-bacterium.svg',  { width: 90,  height: 72  });
    this.load.svg('bad-bacterium',     'assets/sprites/bad-bacterium.svg',     { width: 90,  height: 72  });
    this.load.svg('acid-drop',         'assets/sprites/acid-drop.svg',         { width: 78,  height: 66  });
    this.load.svg('villus',            'assets/sprites/villus.svg',            { width: 78,  height: 420 });

    // --- Hazards / platforms (3×) ---
    this.load.svg('chomping-tooth-upper',   'assets/sprites/chomping-tooth-upper.svg',   { width: 240, height: 180 });
    this.load.svg('chomping-tooth-lower',   'assets/sprites/chomping-tooth-lower.svg',   { width: 240, height: 180 });
    this.load.svg('peristalsis-ring-left',  'assets/sprites/peristalsis-ring-left.svg',  { width: 700, height: 84  });
    this.load.svg('peristalsis-ring-right', 'assets/sprites/peristalsis-ring-right.svg', { width: 700, height: 84  });
    this.load.svg('saliva-blob',            'assets/sprites/saliva-blob.svg',            { width: 210, height: 66  });
    this.load.svg('microvilli-spike',       'assets/sprites/microvilli-spike.svg',       { width: 24,  height: 54  });
    this.load.svg('food-platform',          'assets/sprites/food-platform.svg',          { width: 390, height: 54  });
    this.load.svg('water-platform',         'assets/sprites/water-platform.svg',         { width: 360, height: 54  });
    this.load.svg('methane-pocket',         'assets/sprites/methane-pocket.svg',         { width: 270, height: 78  });
    this.load.svg('fiber-brick-wall',       'assets/sprites/fiber-brick-wall.svg',       { width: 72,  height: 240 });
    this.load.svg('acid-ball',              'assets/sprites/acid-ball.svg',              { width: 90,  height: 90  });

    // --- Collectibles (3×) ---
    this.load.svg('fiber-token',     'assets/sprites/fiber-token.svg',     { width: 78, height: 78 });
    this.load.svg('nutrient-orb',    'assets/sprites/nutrient-orb.svg',    { width: 48, height: 48 });
    this.load.svg('good-bacterium',  'assets/sprites/good-bacterium.svg',  { width: 54, height: 54 });

    // --- Exits + props (3×) ---
    this.load.svg('exit-swallow',    'assets/sprites/exit-swallow.svg',    { width: 180, height: 360 });
    this.load.svg('exit-pylorus',    'assets/sprites/exit-pylorus.svg',    { width: 180, height: 360 });
    this.load.svg('exit-ileocecal',  'assets/sprites/exit-ileocecal.svg',  { width: 180, height: 360 });
    this.load.svg('exit-sigmoid',    'assets/sprites/exit-sigmoid.svg',    { width: 180, height: 360 });
    this.load.svg('exit-tile',       'assets/sprites/exit-tile.svg',       { width: 240, height: 24  });
    this.load.svg('spoon',           'assets/sprites/spoon.svg',           { width: 330, height: 72  });

    // --- Room backgrounds (full-size; cameras scroll across them) ---
    this.load.svg('room-mouth-bg',             'assets/backgrounds/room-mouth.svg',            { width: 2400, height: 720  });
    this.load.svg('room-esophagus-bg',         'assets/backgrounds/room-esophagus.svg',        { width: 1280, height: 3200 });
    this.load.svg('room-stomach-bg',           'assets/backgrounds/room-stomach.svg',          { width: 3600, height: 720  });
    this.load.svg('room-small-intestine-bg',   'assets/backgrounds/room-small-intestine.svg',  { width: 5200, height: 720  });
    this.load.svg('room-large-intestine-bg',   'assets/backgrounds/room-large-intestine.svg',  { width: 3800, height: 720  });
    this.load.svg('room-anus-bg',              'assets/backgrounds/room-anus.svg',             { width: 1280, height: 720  });

    // --- Cut-scene panels (all 800x380 native) ---
    for (const p of CUTSCENE_PANELS) {
      this.load.svg(`cutscene-${p}`, `assets/cutscenes/${p}.svg`, { width: 800, height: 380 });
    }

    // --- Audio ---
    for (const key of SFX_KEYS) {
      this.load.audio(key, `assets/audio/${key}.wav`);
    }
  }

  create() {
    // Hand SoundManager a scene so it can route play(key) to the
    // loaded Phaser audio samples when they exist in cache.
    sound.attachPhaserScene(this);
    this.scene.start('Title');
  }
}
