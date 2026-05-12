import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { touchState } from '../systems/TouchState.js';

// Pause overlay. Launched on top of an actively-playing room via:
//   this.scene.pause();
//   this.scene.launch('Pause', { pausedSceneKey: this.scene.key });
// Resume returns to the room. Quit goes back to Title.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Pause', active: false });
  }

  init(data = {}) {
    this.pausedSceneKey = data.pausedSceneKey || null;
  }

  create() {
    // Reset any held touch buttons so the player doesn't get
    // dragged left/right after resuming.
    touchState.reset();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    this.add.text(cx, cy - 100, 'PAUSED', {
      fontFamily: 'system-ui, sans-serif', fontSize: '64px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    const mkOption = (y, label, onPress) => {
      const t = this.add.text(cx, y, label, {
        fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffffff',
        backgroundColor: '#2a1830', padding: { x: 20, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', onPress);
      return t;
    };

    mkOption(cy + 20, '[P / Esc]  Resume',       () => this.resume());
    mkOption(cy + 80, '[Q]        Quit to Title', () => this.quit());

    this.add.text(cx, GAME_HEIGHT - 40, 'Game paused. Take your time.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-P', () => this.resume());
    this.input.keyboard.on('keydown-ESC', () => this.resume());
    this.input.keyboard.on('keydown-Q', () => this.quit());
  }

  resume() {
    if (this._exited) return;
    this._exited = true;
    if (this.pausedSceneKey) this.scene.resume(this.pausedSceneKey);
    this.scene.stop();
  }

  quit() {
    if (this._exited) return;
    this._exited = true;
    if (this.pausedSceneKey) this.scene.stop(this.pausedSceneKey);
    this.scene.stop('Hud');
    this.scene.stop();
    this.scene.start('Title');
  }
}
