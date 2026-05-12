import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

export default class QuizScene extends Phaser.Scene {
  constructor() {
    super('Quiz');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 140, 'Quiz Mode', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '54px',
      color: '#ffcf73',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 220, 'Placeholder — sudden-death quiz over the 100-question bank.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#e0c8ff',
    }).setOrigin(0.5);

    this.add.text(cx, 260, 'Wired up in Phase 3.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#8899aa',
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT - 60, 'Press Esc to return to Title.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#8899aa',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ESC', () => {
      this.scene.start('Title');
    });
  }
}
