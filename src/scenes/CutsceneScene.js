import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

// Five named cut scenes per BUILD_STATUS.md / STORY.md:
//   liftoff     — opening, kid eats Crispy, "Oh no."
//   tongue      — Tongue boss intro (mouth)
//   blob        — Stomach Acid Blob intro
//   poop        — Poop Boss intro (anus)
//   splashdown  — toilet ending
//
// Until real PNGs land in public/assets/cutscenes/, every cut
// scene renders as labeled placeholder boxes ("PANEL 1",
// "PANEL 2", …) per the workflow rule against final-looking
// placeholder art.
//
// Usage:
//   scene.start('Cutscene', { key: 'liftoff', nextScene: 'RoomMouth' });
//   scene.launch('Cutscene', { key: 'tongue', resumeSceneKey: 'RoomMouth' });
// nextScene = transition (default). resumeSceneKey = overlay; the
// caller is responsible for scene.pause() before launching.

const SCENES = {
  liftoff:    { label: 'Lift Off (opening)',          panels: 3 },
  tongue:     { label: 'Tongue Boss intro',           panels: 2 },
  blob:       { label: 'Stomach Acid Blob intro',     panels: 2 },
  poop:       { label: 'Poop Boss intro',             panels: 2 },
  splashdown: { label: 'Splashdown (ending)',         panels: 3 },
};

const AUTO_ADVANCE_MS = 4000;

export default class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('Cutscene');
  }

  init(data = {}) {
    this.key = data.key || 'liftoff';
    this.nextScene = data.nextScene || null;
    this.resumeSceneKey = data.resumeSceneKey || null;
    this._advanced = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#08070a');
    const spec = SCENES[this.key] || { label: this.key, panels: 2 };
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 60, 'CUT SCENE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '36px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 110, spec.label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#e0c8ff', fontStyle: 'italic',
    }).setOrigin(0.5);

    // Lay out N labeled panel placeholder boxes in a row centered
    // in the canvas. Boxes are loud and obviously placeholder so
    // they don't get mistaken for final art.
    const panels = spec.panels;
    const gap = 30;
    const panelW = Math.min(280, (GAME_WIDTH - 120 - gap * (panels - 1)) / panels);
    const panelH = 320;
    const totalW = panels * panelW + (panels - 1) * gap;
    const startX = cx - totalW / 2 + panelW / 2;
    const panelY = GAME_HEIGHT / 2 + 20;

    for (let i = 0; i < panels; i++) {
      const px = startX + i * (panelW + gap);
      const box = this.add.rectangle(px, panelY, panelW, panelH, 0x2a1830);
      box.setStrokeStyle(3, 0xffcf73);
      this.add.text(px, panelY, `PANEL ${i + 1}`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '28px', color: '#ffcf73', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(px, panelY + panelH / 2 - 16, '(placeholder)', {
        fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#888888',
      }).setOrigin(0.5);
    }

    this.add.text(cx, GAME_HEIGHT - 40, 'Press SPACE / click to advance · auto-advance in 4s', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#666666',
    }).setOrigin(0.5);

    const advance = () => this.advance();
    this.input.keyboard.once('keydown-SPACE', advance);
    this.input.keyboard.once('keydown-ENTER', advance);
    this.input.once('pointerdown', advance);
    this.time.delayedCall(AUTO_ADVANCE_MS, advance);
  }

  advance() {
    if (this._advanced) return;
    this._advanced = true;
    if (this.resumeSceneKey) {
      this.scene.resume(this.resumeSceneKey);
      this.scene.stop();
    } else if (this.nextScene) {
      this.scene.start(this.nextScene);
    } else {
      this.scene.start('Title');
    }
  }
}
