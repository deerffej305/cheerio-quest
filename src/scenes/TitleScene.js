import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Hero portrait, top-right so it doesn't crowd the menu column.
    this.add.image(GAME_WIDTH - 160, GAME_HEIGHT / 2, 'crispy-big').setDisplaySize(220, 220);

    this.add.text(cx, 90, 'Journey to the Center of the Anus', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '48px',
      color: '#ffcf73',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 140, 'Crispy the Cheerio, in six organs', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#e0c8ff',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    const mainItems = [
      { label: '[1] Play Game', scene: 'GameMode', key: 'ONE' },
      { label: '[2] Quiz Mode', scene: 'QuizArcade', key: 'TWO' },
      { label: '[3] Leaderboards', scene: 'Leaderboard', key: 'THREE' },
    ];

    mainItems.forEach((item, i) => {
      this.add.text(cx, 240 + i * 56, item.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start(item.scene));
    });

    mainItems.forEach((item) => {
      this.input.keyboard.once(`keydown-${item.key}`, () => {
        this.scene.start(item.scene);
      });
    });

    this.add.text(cx, GAME_HEIGHT - 30, 'Press 1–3 or click to choose', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#8899aa',
    }).setOrigin(0.5);
  }
}
