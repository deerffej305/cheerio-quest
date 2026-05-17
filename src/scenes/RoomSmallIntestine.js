import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import Villus from '../entities/enemies/Villus.js';
import Microvilli from '../entities/hazards/Microvilli.js';
import NutrientOrb from '../entities/NutrientOrb.js';
import FiberToken from '../entities/FiberToken.js';
import { sound } from '../systems/SoundManager.js';

// Room 4 — Small Intestine. Auto-scroller. The camera moves right at
// a fixed (but ramping) speed; Crispy must keep up or be left
// behind. Per CJ rework: faster scroll, faster Crispy, longer track,
// more spacing between hazards, bile laser cut entirely.
//
// Hazards:
//   - Villi: wavy tentacles rooted on the floor. Stompable.
//   - Microvilli: tight floor-spike clusters. Not stompable; contact
//     = damage.
//   - Off-screen left: instant restart (even when Big).
//
// Collectibles: nutrient orbs (+5 each).

const ROOM_WIDTH = 9500;
const FLOOR_Y = 620;
const SPAWN_X = 120;
const SPAWN_Y = 500;
const EXIT_X = ROOM_WIDTH - 100;
// CJ wants noticeably faster auto-scroll. Doubled the previous numbers.
const SCROLL_BASE = 520;
const SCROLL_PEAK = 800;
// Crispy moves 3.5× normal so he keeps pace with the much-faster
// scroll (both roughly 2× the previous values).
const CHEERIO_SPEED_MULT = 3.5;
const OFFSCREEN_MARGIN = 30;

export default class RoomSmallIntestine extends Phaser.Scene {
  constructor() {
    super('RoomSmallIntestine');
  }

  create() {
    this.phase = 'play';
    this.cameras.main.setBackgroundColor('#5a2236');
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, GAME_HEIGHT);

    this.inputs = new InputManager(this);
    this.platforms = this.physics.add.staticGroup();
    this.scrollX = 0;
    this.scrollLocked = false;

    this.buildWorld();
    this.spawnCheerio();
    this.spawnVilli();
    this.spawnMicrovilli();
    this.spawnNutrientOrbs();
    this.spawnFiberToken();
    this.spawnExit();
    this.spawnWarningOverlay();

    this.bindEsc();
    this.scene.get('Hud')?.setRoomLabel('Room 4 — Small Intestine');
  }

  // --- World geometry ---------------------------------------------

  buildWorld() {
    // Background — painted intestine. Tile-stretched to the longer
    // ROOM_WIDTH so the painted tube covers the whole track.
    const bg = this.add.image(ROOM_WIDTH / 2, GAME_HEIGHT / 2, 'room-small-intestine-bg');
    bg.setDisplaySize(ROOM_WIDTH, GAME_HEIGHT);
    bg.setDepth(-10);

    const ground = this.add.rectangle(ROOM_WIDTH / 2, FLOOR_Y + 40, ROOM_WIDTH, 80, 0xc06078).setVisible(false);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    const ceiling = this.add.rectangle(ROOM_WIDTH / 2, 20, ROOM_WIDTH, 40, 0x882044).setVisible(false);
    this.physics.add.existing(ceiling, true);
    this.platforms.add(ceiling);

    this.add.text(160, 80, 'Keep up! Camera scrolls right →', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffd0d8',
    });
  }

  // --- Cheerio ----------------------------------------------------

  spawnCheerio() {
    this.cheerio = new Cheerio(this, SPAWN_X, SPAWN_Y);
    this.cheerio.setMoveSpeedMultiplier(CHEERIO_SPEED_MULT);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);
    this.cameras.main.setScroll(0, 0);
  }

  // --- Villi + Microvilli + Orbs ----------------------------------

  spawnVilli() {
    this.villi = [];
    // Slightly wider + taller than original (was 26x100-140); not as
    // chunky as the previous 110x180-240 pass.
    const specs = [
      { x: 1100, h: 150 },
      { x: 2400, h: 180 },
      { x: 3700, h: 160 },
      { x: 5000, h: 200 },
      { x: 6300, h: 170 },
      { x: 7600, h: 190 },
      { x: 8900, h: 160 },
    ];
    for (const { x, h } of specs) {
      const v = new Villus(this, x, FLOOR_Y, { width: 60, height: h });
      this.physics.add.collider(this.cheerio.sprite, v.sprite, () => this.handleVillusContact(v));
      this.villi.push(v);
    }
  }

  spawnMicrovilli() {
    this.microvilli = [];
    // Scaled up vs the 24x54 baseline, but less than the 40x90 we
    // tried last pass.
    const specs = [
      { x: 1750, count: 4 },
      { x: 3050, count: 5 },
      { x: 4350, count: 4 },
      { x: 5650, count: 5 },
      { x: 6950, count: 4 },
      { x: 8250, count: 5 },
    ];
    for (const { x, count } of specs) {
      const mv = new Microvilli(this, x, FLOOR_Y, {
        spikeCount: count,
        spikeWidth: 32,
        spikeHeight: 72,
        gap: 8,
      });
      for (const spike of mv.bodies) {
        this.physics.add.overlap(this.cheerio.sprite, spike, () => this.handleMicrovilliContact());
      }
      this.microvilli.push(mv);
    }
  }

  spawnNutrientOrbs() {
    this.orbs = [];
    // 8 orbs spread over the 9500 track, varied heights — pulls the
    // player up-and-down through the obstacle field.
    const specs = [
      { x: 1400, y: FLOOR_Y - 150 },
      { x: 2700, y: FLOOR_Y - 200 },
      { x: 4000, y: FLOOR_Y - 240 },
      { x: 5300, y: FLOOR_Y - 180 },
      { x: 6600, y: FLOOR_Y - 230 },
      { x: 7900, y: FLOOR_Y - 200 },
      { x: 8600, y: FLOOR_Y - 260 },
      { x: 9100, y: FLOOR_Y - 180 },
    ];
    for (const { x, y } of specs) {
      const orb = new NutrientOrb(this, x, y);
      this.physics.add.overlap(this.cheerio.sprite, orb.sprite, () => this.handleOrbPickup(orb));
      this.orbs.push(orb);
    }
  }

  spawnFiberToken() {
    // Just before the exit, lifted high — risk grab in the final stretch.
    this.fiberToken = new FiberToken(this, ROOM_WIDTH - 260, FLOOR_Y - 250);
    this.physics.add.overlap(this.cheerio.sprite, this.fiberToken.sprite, () => this.handleFiberPickup());
  }

  // --- Exit -------------------------------------------------------

  spawnExit() {
    this.exitDoor = this.add.image(EXIT_X, FLOOR_Y - 60, 'exit-ileocecal');
    this.exitDoor.setDisplaySize(180, 360);
    this.add.text(EXIT_X, FLOOR_Y - 140, 'ILEOCECAL\nVALVE →', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#a0ffa0', align: 'center',
    }).setOrigin(0.5);
    this.physics.add.existing(this.exitDoor);
    this.exitDoor.body.setAllowGravity(false);
    this.exitDoor.body.setImmovable(true);
    this.physics.add.overlap(this.cheerio.sprite, this.exitDoor, () => this.completeRoom());
  }

  // --- Off-screen left warning -----------------------------------

  spawnWarningOverlay() {
    this.warning = this.add.rectangle(0, GAME_HEIGHT / 2, 100, GAME_HEIGHT, 0xff4040, 0)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
  }

  // --- Contact handlers ------------------------------------------

  handleVillusContact(v) {
    if (!v.alive || !this.cheerio.alive) return;
    const stomped = this.cheerio.body.touching.down && v.sprite.body.touching.up;
    if (stomped) {
      v.squash();
      scoreManager.addPoints(10);
      this.cheerio.body.setVelocityY(-420);
      sound.play('stomp');
      this.hud()?.flash('+10');
    } else {
      this.applyHitToCheerio();
    }
  }

  handleMicrovilliContact() {
    if (!this.cheerio.alive) return;
    this.applyHitToCheerio();
  }

  handleOrbPickup(orb) {
    if (orb.collected || !this.cheerio.alive) return;
    orb.collect();
    scoreManager.addPoints(5);
    sound.play('score');
    this.hud()?.flash('+5');
  }

  handleFiberPickup() {
    if (this.fiberToken.collected || !this.cheerio.alive) return;
    this.fiberToken.collect();
    scoreManager.addFiber();
    sound.play('fiber');
    if (this.cheerio.state === 'small') {
      this.cheerio.grow();
      this.hud()?.setSize('big');
      this.hud()?.flash('GROWING!');
    } else {
      scoreManager.addPoints(10);
      this.hud()?.flash('Fiber +10');
    }
  }

  applyHitToCheerio() {
    const outcome = this.cheerio.takeHit();
    if (outcome === 'shrunk') {
      this.hud()?.setSize('small');
      this.hud()?.flash('OUCH!');
    } else if (outcome === 'died') {
      this.handleDeath('OUCH!');
    }
  }

  handleDeath(reason = '-20  RESTART') {
    if (this.phase === 'dying') return;
    this.phase = 'dying';
    scoreManager.payDeathPenalty();
    this.hud()?.flash(reason, 1200);
    this.time.delayedCall(1100, () => this.scene.restart());
  }

  completeRoom() {
    if (this.phase !== 'play') return;
    this.phase = 'won';
    this.cheerio.freezeControl(true);
    this.cheerio.body.setVelocity(0, 0);
    sound.play('room-clear');
    this.hud()?.flash('ROOM CLEARED — quiz time!', 1500);
    this.time.delayedCall(1600, () => {
      this.scene.start('Quiz', { room: 'small_intestine', nextScene: 'RoomLargeIntestine' });
    });
  }

  // --- Frame loop -------------------------------------------------

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);
    if (this.phase !== 'play') return;

    const stopScrollAt = ROOM_WIDTH - GAME_WIDTH;
    if (!this.scrollLocked) {
      const progress = Phaser.Math.Clamp(this.scrollX / stopScrollAt, 0, 1);
      const speed = Phaser.Math.Linear(SCROLL_BASE, SCROLL_PEAK, progress);
      this.scrollX += speed * (delta / 1000);
      if (this.scrollX >= stopScrollAt) {
        this.scrollX = stopScrollAt;
        this.scrollLocked = true;
      }
      this.cameras.main.setScroll(this.scrollX, 0);
    }

    const leftEdge = this.scrollX;
    const safeX = leftEdge + OFFSCREEN_MARGIN + this.cheerio.sprite.displayWidth / 2;
    const dangerSpan = 220;
    const dangerPct = Phaser.Math.Clamp((safeX - this.cheerio.x) / dangerSpan, 0, 1);
    this.warning.setAlpha(0.55 * dangerPct);
    if (this.cheerio.x + this.cheerio.sprite.displayWidth / 2 < leftEdge + OFFSCREEN_MARGIN) {
      this.cheerio.die('fall');
      this.handleDeath('LEFT BEHIND!');
    }

    for (const v of this.villi) v.update();
  }

  // --- Helpers ----------------------------------------------------

  hud() {
    return this.scene.get('Hud');
  }

  bindEsc() {
    const openPause = () => {
      this.scene.pause();
      this.scene.launch('Pause', { pausedSceneKey: this.scene.key });
    };
    this.input.keyboard.on('keydown-ESC', openPause);
    this.input.keyboard.on('keydown-P', openPause);
  }
}
