import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 140, 'Journey to the Center of the Anus', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '54px',
      color: '#ffcf73',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 200, 'a Cheerio\'s tale, in six organs', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#e0c8ff',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    const menuItems = [
      { label: '[1] Game Mode', scene: 'GameMode', key: 'ONE' },
      { label: '[2] Quiz Mode', scene: 'Quiz', key: 'TWO' },
      { label: '[3] Leaderboards', scene: 'Leaderboard', key: 'THREE' },
    ];

    menuItems.forEach((item, i) => {
      this.add.text(cx, 360 + i * 60, item.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
      }).setOrigin(0.5);
    });

    this.add.text(cx, GAME_HEIGHT - 60, 'Press 1, 2, or 3 to start.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#8899aa',
    }).setOrigin(0.5);

    menuItems.forEach((item) => {
      this.input.keyboard.once(`keydown-${item.key}`, () => {
        this.scene.start(item.scene);
      });
    });
  }
}
