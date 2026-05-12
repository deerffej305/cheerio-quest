import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';

export default class GameModeScene extends Phaser.Scene {
  constructor() {
    super('GameMode');
  }

  create() {
    this.add.text(GAME_WIDTH / 2, 40, 'Game Mode — Phase 1 sandbox', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#ffcf73',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 70, 'Left / Right or A / D to move. Space / Up / W to jump. Esc to go back.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.platforms = this.physics.add.staticGroup();

    const groundY = GAME_HEIGHT - 40;
    const ground = this.add.rectangle(GAME_WIDTH / 2, groundY, GAME_WIDTH, 80, 0x3a2030);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    const ledges = [
      { x: 260, y: GAME_HEIGHT - 200, w: 220, h: 20 },
      { x: 640, y: GAME_HEIGHT - 320, w: 200, h: 20 },
      { x: 1020, y: GAME_HEIGHT - 220, w: 240, h: 20 },
    ];
    ledges.forEach(({ x, y, w, h }) => {
      const r = this.add.rectangle(x, y, w, h, 0x5a3050);
      this.physics.add.existing(r, true);
      this.platforms.add(r);
    });

    this.inputs = new InputManager(this);

    this.cheerio = new Cheerio(this, 200, GAME_HEIGHT - 200);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);

    this.input.keyboard.once('keydown-ESC', () => {
      this.scene.start('Title');
    });
  }

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);
  }
}
