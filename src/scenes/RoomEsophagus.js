import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import PeristalsisRing from '../entities/hazards/PeristalsisRing.js';
import FiberToken from '../entities/FiberToken.js';
import { sound } from '../systems/SoundManager.js';

const TUBE_W = 600;
const TUBE_LEFT = (GAME_WIDTH - TUBE_W) / 2;       // 340
const TUBE_RIGHT = TUBE_LEFT + TUBE_W;             // 940
const ROOM_HEIGHT = 3200;
const SPAWN_X = GAME_WIDTH / 2;                    // 640
const SPAWN_Y = 120;
const EXIT_Y = ROOM_HEIGHT - 120;                  // 3080

// Slow the fall so the player has time to read each ring's gap and
// nudge sideways. Default Cheerio max y velocity is 1600 (built for
// platformer drops) — way too fast for a 3200-tall tube.
const ESOPHAGUS_TERMINAL_VY = 275;

export default class RoomEsophagus extends Phaser.Scene {
  constructor() {
    super('RoomEsophagus');
  }

  create() {
    this.phase = 'play';
    this.cameras.main.setBackgroundColor('#2a0810');
    this.physics.world.setBounds(0, 0, GAME_WIDTH, ROOM_HEIGHT);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, ROOM_HEIGHT);

    this.inputs = new InputManager(this);
    this.platforms = this.physics.add.staticGroup();

    this.buildTube();
    this.spawnCheerio();
    this.spawnRings();
    this.spawnFiberToken();
    this.spawnExit();
    this.bindEsc();

    this.scene.get('Hud')?.setRoomLabel('Room 2 — Esophagus');
  }

  // --- Geometry ---------------------------------------------------

  buildTube() {
    // Left and right walls of the tube. Solid colliders so the
    // cheerio bounces between them while falling.
    const leftWall = this.add.rectangle(
      TUBE_LEFT / 2,
      ROOM_HEIGHT / 2,
      TUBE_LEFT,
      ROOM_HEIGHT,
      0x4a1020,
    );
    this.physics.add.existing(leftWall, true);
    this.platforms.add(leftWall);

    const rightWallW = GAME_WIDTH - TUBE_RIGHT;
    const rightWall = this.add.rectangle(
      TUBE_RIGHT + rightWallW / 2,
      ROOM_HEIGHT / 2,
      rightWallW,
      ROOM_HEIGHT,
      0x4a1020,
    );
    this.physics.add.existing(rightWall, true);
    this.platforms.add(rightWall);

    // Tube interior tint — a slight gradient feel using two stripes.
    this.add.rectangle(GAME_WIDTH / 2, ROOM_HEIGHT / 2, TUBE_W, ROOM_HEIGHT, 0x6a1828, 0.4)
      .setStrokeStyle(2, 0x882030);

    // Top cap label.
    this.add.text(GAME_WIDTH / 2, 50, 'from the mouth ↓', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffaaa8',
    }).setOrigin(0.5);
  }

  // --- Cheerio ----------------------------------------------------

  spawnCheerio() {
    this.cheerio = new Cheerio(this, SPAWN_X, SPAWN_Y);
    this.cheerio.body.setMaxVelocity(280 * 1.5, ESOPHAGUS_TERMINAL_VY);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);
    this.cameras.main.startFollow(this.cheerio.sprite, true, 0.18, 0.18);
  }

  // --- Hazards ----------------------------------------------------

  spawnRings() {
    // Pre-place rings at fixed y intervals through the tube. Each
    // ring has a randomized gap position so the player has to react
    // to a new alignment for every one.
    this.rings = [];
    const ringCount = 7;
    const startY = 480;
    const endY = EXIT_Y - 240;
    const spacing = (endY - startY) / (ringCount - 1);

    for (let i = 0; i < ringCount; i++) {
      const y = startY + i * spacing;
      const gapMin = TUBE_LEFT + 90;
      const gapMax = TUBE_RIGHT - 90;
      const gapX = Phaser.Math.Between(gapMin, gapMax);
      const ring = new PeristalsisRing(this, y, TUBE_LEFT, TUBE_RIGHT, gapX, {
        gapWidth: 140,
        thickness: 28,
        riseSpeed: 60,
      });
      this.physics.add.overlap(this.cheerio.sprite, ring.leftSeg, () => this.handleRingHit(ring));
      this.physics.add.overlap(this.cheerio.sprite, ring.rightSeg, () => this.handleRingHit(ring));
      this.rings.push(ring);
    }
  }

  spawnFiberToken() {
    // One fiber token tucked into a riskier gap — for now, randomly
    // placed adjacent to one of the rings. Full branching-folds
    // logic is a later pass.
    const ring = this.rings[Math.floor(this.rings.length / 2)];
    const tokenX = ring.leftSeg.x > GAME_WIDTH / 2 ? TUBE_LEFT + 60 : TUBE_RIGHT - 60;
    this.fiberToken = new FiberToken(this, tokenX, ring.y - 60);
    this.physics.add.overlap(this.cheerio.sprite, this.fiberToken.sprite, () => this.handleFiberPickup());
  }

  // --- Exit -------------------------------------------------------

  spawnExit() {
    this.exitLine = this.add.rectangle(GAME_WIDTH / 2, EXIT_Y, TUBE_W, 40, 0x60ff80);
    this.exitLine.setAlpha(0.55);
    this.physics.add.existing(this.exitLine);
    this.exitLine.body.setAllowGravity(false);
    this.exitLine.body.setImmovable(true);
    this.physics.add.overlap(this.cheerio.sprite, this.exitLine, () => this.completeRoom());

    this.add.text(GAME_WIDTH / 2, EXIT_Y - 40, 'STOMACH ↓', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#a0ffa0', fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // --- Contact handlers ------------------------------------------

  handleRingHit(ring) {
    if (!this.cheerio.alive || this.phase === 'dying') return;
    if (!ring.alive) return;
    const outcome = this.cheerio.takeHit();
    if (outcome === 'shrunk') {
      this.hud()?.setSize('small');
      this.hud()?.flash('SQUEEZED!');
    } else if (outcome === 'died') {
      this.handleDeath();
    }
  }

  handleFiberPickup() {
    if (this.fiberToken.collected || !this.cheerio.alive) return;
    this.fiberToken.collect();
    scoreManager.addFiber();
    sound.playFiber();
    if (this.cheerio.state === 'small') {
      this.cheerio.grow();
      this.hud()?.setSize('big');
      this.hud()?.flash('GROWING!');
    } else {
      scoreManager.addPoints(10);
      this.hud()?.flash('Fiber +10');
    }
  }

  handleDeath() {
    if (this.phase === 'dying') return;
    this.phase = 'dying';
    scoreManager.payDeathPenalty();
    this.hud()?.flash('-20  RESTART', 1200);
    this.time.delayedCall(1100, () => this.scene.restart());
  }

  // --- Frame loop -------------------------------------------------

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);

    // Despawn rings that rise off the top so they don't accumulate
    // physics work as the cheerio falls past them.
    for (const ring of this.rings) {
      if (ring.alive && ring.y < this.cameras.main.scrollY - 60) {
        ring.destroy();
      }
    }

    // Off-bottom safety — if for any reason the cheerio falls past
    // the exit without triggering it, end the room anyway.
    if (this.phase === 'play' && this.cheerio.y > ROOM_HEIGHT - 40) {
      this.completeRoom();
    }
  }

  completeRoom() {
    if (this.phase !== 'play') return;
    this.phase = 'won';
    this.cheerio.freezeControl(true);
    this.cheerio.body.setVelocity(0, 0);
    sound.playRoomClear();
    this.hud()?.flash('ROOM CLEARED — quiz time!', 1500);
    this.time.delayedCall(1600, () => {
      this.scene.start('Quiz', { room: 'esophagus', nextScene: 'RoomStomach' });
    });
  }

  // --- Helpers ----------------------------------------------------

  hud() {
    return this.scene.get('Hud');
  }

  bindEsc() {
    this.input.keyboard.once('keydown-ESC', () => {
      this.scene.stop('Hud');
      this.scene.start('Title');
    });
  }
}
