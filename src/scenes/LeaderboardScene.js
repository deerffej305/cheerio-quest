import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 100, 'Leaderboards', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '54px',
      color: '#ffcf73',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const columns = [
      { title: 'Most Points', x: cx - 380 },
      { title: 'Most Questions Correct', x: cx },
      { title: 'Quiz Streak', x: cx + 380 },
    ];

    columns.forEach((c) => {
      this.add.text(c.x, 220, c.title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#e0c8ff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      for (let i = 0; i < 10; i++) {
        this.add.text(c.x, 270 + i * 28, `${i + 1}.  —`, {
          fontFamily: 'system-ui, monospace',
          fontSize: '18px',
          color: '#aaaaaa',
        }).setOrigin(0.5);
      }
    });

    this.add.text(cx, GAME_HEIGHT - 60, 'Press Esc to return. (Backend wired up in Phase 5.)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#8899aa',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ESC', () => {
      this.scene.start('Title');
    });
  }
}
