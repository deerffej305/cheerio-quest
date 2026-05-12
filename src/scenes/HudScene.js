import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import { sound } from '../systems/SoundManager.js';
import { touchState } from '../systems/TouchState.js';

// Overlay scene. Runs in parallel with the active room scene, fixed
// to the camera, so the room scene can scroll without dragging HUD
// elements with it.
export default class HudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Hud', active: false });
  }

  create(data = {}) {
    this.roomLabel = data.roomLabel || '';

    const style = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    };

    this.pointsText = this.add.text(20, 18, '', style);
    this.fiberText = this.add.text(20, 44, '', style);
    this.sizeText = this.add.text(GAME_WIDTH - 20, 18, '', style).setOrigin(1, 0);
    this.roomText = this.add.text(GAME_WIDTH / 2, 18, this.roomLabel, {
      ...style,
      fontStyle: 'bold',
      color: '#ffcf73',
    }).setOrigin(0.5, 0);

    this.flashText = this.add.text(GAME_WIDTH / 2, 100, '', {
      ...style,
      fontSize: '28px',
      color: '#ffe070',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Mute indicator + key binding. M toggles audio globally.
    this.muteText = this.add.text(GAME_WIDTH - 20, 70, this.muteLabel(), {
      ...style,
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(1, 0);

    this.input.keyboard.on('keydown-M', () => {
      sound.toggleMute();
      this.muteText.setText(this.muteLabel());
    });

    this.cheerioSize = 'big';
    this.spawnTouchPad();
    this.refresh();
  }

  // On-screen D-pad cross per design §3 (Surface-tablet target).
  // Left / Right / Up + a cosmetic Down. Up doubles as Jump. State
  // is published to the shared TouchState singleton, which the
  // Cheerio's InputManager checks alongside the keyboard.
  spawnTouchPad() {
    const padCx = 110;
    const padCy = GAME_HEIGHT - 110;
    const btn = 56;
    const off = btn + 4;

    const makeBtn = (x, y, label, onDown, onUp) => {
      const r = this.add.rectangle(x, y, btn, btn, 0xffffff, 0.18)
        .setStrokeStyle(2, 0xffffff, 0.35)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, y, label, {
        fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.7);
      const press = () => {
        r.setFillStyle(0xffffff, 0.35);
        onDown();
      };
      const release = () => {
        r.setFillStyle(0xffffff, 0.18);
        onUp();
      };
      r.on('pointerdown', press);
      r.on('pointerup', release);
      r.on('pointerupoutside', release);
      r.on('pointerout', release);
      return r;
    };

    makeBtn(padCx,        padCy - off, '↑', () => touchState.setJump(true),  () => touchState.setJump(false));
    makeBtn(padCx,        padCy + off, '↓', () => {},                          () => {}); // visual only
    makeBtn(padCx - off,  padCy,       '←', () => touchState.setLeft(true),  () => touchState.setLeft(false));
    makeBtn(padCx + off,  padCy,       '→', () => touchState.setRight(true), () => touchState.setRight(false));

    this.add.text(padCx, padCy + off + 36, 'tap or arrow keys', {
      fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#888888',
    }).setOrigin(0.5);
  }

  muteLabel() {
    return sound.isMuted() ? 'muted [M to unmute]' : 'audio on [M to mute]';
  }

  setRoomLabel(label) {
    this.roomLabel = label;
    if (this.roomText) this.roomText.setText(label);
  }

  setSize(size) {
    this.cheerioSize = size;
    this.refresh();
  }

  flash(message, durationMs = 1400) {
    this.flashText.setText(message);
    this.flashText.setAlpha(1);
    this.tweens.add({
      targets: this.flashText,
      alpha: 0,
      delay: durationMs - 400,
      duration: 400,
    });
  }

  refresh() {
    this.pointsText.setText(`Points: ${scoreManager.points}`);
    this.fiberText.setText(`Fiber: ${scoreManager.fiberCount}`);
    this.sizeText.setText(`Cheerio: ${this.cheerioSize.toUpperCase()}`);
  }

  update() {
    this.refresh();
  }
}
