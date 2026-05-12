import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

// Cut-scene placeholder. Sits between an end-of-room quiz and the
// next room scene. For now: a black background with "CUT SCENE"
// and the transition labels, auto-advance after 2.5s OR press
// SPACE / click to skip. Real narrative + biology art lands in the
// polish pass per design §12.
const AUTO_ADVANCE_MS = 2500;

export default class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('Cutscene');
  }

  init(data = {}) {
    this.fromLabel = data.fromLabel || '';
    this.toLabel = data.toLabel || '';
    this.nextScene = data.nextScene || 'Title';
  }

  create() {
    this.cameras.main.setBackgroundColor('#08070a');
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.text(cx, cy - 60, 'CUT SCENE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '64px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, `${this.fromLabel} → ${this.toLabel}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '28px', color: '#e0c8ff', fontStyle: 'italic',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 80, '(narrative + biology art comes in the polish pass)', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#777777',
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT - 40, 'Press SPACE / click to skip', {
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
    this.scene.start(this.nextScene);
  }
}
