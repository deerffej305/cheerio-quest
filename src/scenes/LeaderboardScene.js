import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { leaderboardClient, BOARDS, BOARD_LABEL } from '../systems/LeaderboardClient.js';

// Shows the top 10 of all three boards in a 3-column layout.
// Fetches live from the Cloudflare Worker. Press R to refresh,
// Esc to return to Title.
export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a0a1e');
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 50, 'Leaderboards', {
      fontFamily: 'system-ui, sans-serif', fontSize: '48px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, 100, 'Loading…', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Three column anchor xs, evenly spread.
    this.columnX = [cx - 380, cx, cx + 380];
    this.columnGroups = [[], [], []];

    BOARDS.forEach((board, i) => {
      this.add.text(this.columnX[i], 160, BOARD_LABEL[board], {
        fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#e0c8ff', fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    this.add.text(cx, GAME_HEIGHT - 30, 'Press R to refresh · Esc to return', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#8899aa',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-R', () => this.refresh());
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Title'));

    this.refresh();
  }

  clearColumns() {
    for (const group of this.columnGroups) {
      for (const t of group) t.destroy();
    }
    this.columnGroups = [[], [], []];
  }

  async refresh() {
    this.statusText.setText('Loading…');
    this.clearColumns();
    const all = await leaderboardClient.fetchAll();
    BOARDS.forEach((board, i) => {
      const entries = all[board];
      for (let row = 0; row < 10; row++) {
        const e = entries[row];
        const line = e
          ? `${row + 1}.  ${e.name.padEnd(15, ' ').slice(0, 15)}  ${e.score}`
          : `${row + 1}.  —`;
        const t = this.add.text(this.columnX[i], 210 + row * 30, line, {
          fontFamily: 'system-ui, monospace', fontSize: '17px', color: row < 3 ? '#ffd060' : '#cccccc',
        }).setOrigin(0.5);
        this.columnGroups[i].push(t);
      }
    });
    this.statusText.setText(`Updated ${new Date().toLocaleTimeString()}`);
  }
}
