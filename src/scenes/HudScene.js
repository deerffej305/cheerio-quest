import Phaser from 'phaser';
import { GAME_WIDTH } from '../main.js';
import { scoreManager } from '../systems/ScoreManager.js';

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

    this.cheerioSize = 'big';
    this.refresh();
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
