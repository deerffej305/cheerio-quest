import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 90, 'Journey to the Center of the Anus', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '48px',
      color: '#ffcf73',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 140, 'a Cheerio\'s tale, in six organs', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#e0c8ff',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Main menu — proper game modes.
    const mainItems = [
      { label: '[1] Game Mode (full play-through)', scene: 'GameMode', key: 'ONE' },
      { label: '[2] Quiz Mode (sudden-death streak)', scene: 'QuizArcade', key: 'TWO' },
      { label: '[3] Leaderboards', scene: 'Leaderboard', key: 'THREE' },
    ];

    mainItems.forEach((item, i) => {
      this.add.text(cx, 220 + i * 42, item.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
      }).setOrigin(0.5);
    });

    mainItems.forEach((item) => {
      this.input.keyboard.once(`keydown-${item.key}`, () => {
        this.scene.start(item.scene);
      });
    });

    // Beta room-jumper — playtest helper so you can drop straight
    // into any room without grinding through the prior ones. Resets
    // the score on entry so each jump is a fresh slate.
    this.add.text(cx, 380, '— Beta: jump to any room (resets score) —', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffa860',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    const beta = [
      { label: '[4] Mouth',           sceneKey: 'RoomMouth',           roomLabel: 'Room 1 — Mouth',           key: 'FOUR' },
      { label: '[5] Esophagus',       sceneKey: 'RoomEsophagus',       roomLabel: 'Room 2 — Esophagus',       key: 'FIVE' },
      { label: '[6] Stomach',         sceneKey: 'RoomStomach',         roomLabel: 'Room 3 — Stomach',         key: 'SIX' },
      { label: '[7] Small Intestine', sceneKey: 'RoomSmallIntestine',  roomLabel: 'Room 4 — Small Intestine', key: 'SEVEN' },
      { label: '[8] Large Intestine', sceneKey: 'RoomLargeIntestine',  roomLabel: 'Room 5 — Large Intestine', key: 'EIGHT' },
      { label: '[9] Anus (final)',    sceneKey: 'RoomAnus',            roomLabel: 'Room 6 — Anus',            key: 'NINE' },
    ];

    beta.forEach((item, i) => {
      this.add.text(cx, 420 + i * 32, item.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffd0a8',
      }).setOrigin(0.5);
    });

    beta.forEach((item) => {
      this.input.keyboard.once(`keydown-${item.key}`, () => {
        scoreManager.resetRun();
        this.scene.launch('Hud', { roomLabel: item.roomLabel });
        this.scene.start(item.sceneKey);
      });
    });

    this.add.text(cx, GAME_HEIGHT - 30, 'Press 1–3 for main modes · 4–9 to jump to a room', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#8899aa',
    }).setOrigin(0.5);
  }
}
