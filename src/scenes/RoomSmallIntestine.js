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

// Room 4 — Small Intestine. Auto-scroller. The camera moves right
// at a fixed speed; the cheerio must keep up or get crushed off
// the left edge. Obstacles arrive from the right as the camera
// reveals them.
//
// Hazards:
//   - Villi: wavy tentacles rooted on the floor. Stompable.
//   - Microvilli: tight floor-spike clusters. Not stompable; contact
//     = damage.
//   - Off-screen left: instant restart (even when Big).
//
// Collectibles: nutrient orbs (+5 each). Risk-reward — they sit
// near the hazards so chasing them pulls the cheerio toward danger.
//
// Speed curve: starts at SCROLL_BASE px/s and ramps to SCROLL_PEAK
// near the exit. Bile injection event is deferred.

const ROOM_WIDTH = 5200;
const FLOOR_Y = 620;
const SPAWN_X = 120;
const SPAWN_Y = 500;
const EXIT_X = ROOM_WIDTH - 100;
const SCROLL_BASE = 90;   // px/s at start
const SCROLL_PEAK = 140;  // px/s near the exit
const OFFSCREEN_MARGIN = 30; // body.right must stay this far past scroll edge

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
    this.scrollX = 0;          // camera-driven scroll, monotonically increasing
    this.scrollLocked = false; // true once we hit the exit area

    this.buildWorld();
    this.spawnCheerio();
    this.spawnVilli();
    this.spawnMicrovilli();
    this.spawnNutrientOrbs();
    this.spawnFiberToken();
    this.spawnExit();
    this.spawnWarningOverlay();
    this.spawnBileInjector();

    this.bindEsc();
    this.scene.get('Hud')?.setRoomLabel('Room 4 — Small Intestine');
  }

  // --- World geometry ---------------------------------------------

  buildWorld() {
    // Background — painted intestine.
    this.add.image(ROOM_WIDTH / 2, GAME_HEIGHT / 2, 'room-small-intestine-bg').setDepth(-10);

    // Floor across the room — invisible hitbox.
    const ground = this.add.rectangle(ROOM_WIDTH / 2, FLOOR_Y + 40, ROOM_WIDTH, 80, 0xc06078).setVisible(false);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Ceiling — invisible hitbox.
    const ceiling = this.add.rectangle(ROOM_WIDTH / 2, 20, ROOM_WIDTH, 40, 0x882044).setVisible(false);
    this.physics.add.existing(ceiling, true);
    this.platforms.add(ceiling);

    // Hint label.
    this.add.text(160, 80, 'Keep up! Camera scrolls right →', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffd0d8',
    });
  }

  // --- Cheerio ----------------------------------------------------

  spawnCheerio() {
    this.cheerio = new Cheerio(this, SPAWN_X, SPAWN_Y);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);
    // We drive the camera scroll manually — no follow.
    this.cameras.main.setScroll(0, 0);
  }

  // --- Villi + Microvilli + Orbs ----------------------------------

  spawnVilli() {
    this.villi = [];
    // Spaced through the room. Heights vary so the player can't
    // just hold "jump" — they need different jump arcs.
    const specs = [
      { x: 700, h: 100 },
      { x: 1080, h: 130 },
      { x: 1500, h: 110 },
      { x: 1900, h: 140 },
      { x: 2350, h: 120 },
      { x: 2800, h: 130 },
      { x: 3250, h: 140 },
      { x: 3700, h: 130 },
      { x: 4180, h: 110 },
      { x: 4600, h: 130 },
    ];
    for (const { x, h } of specs) {
      const v = new Villus(this, x, FLOOR_Y, { height: h });
      this.physics.add.collider(this.cheerio.sprite, v.sprite, () => this.handleVillusContact(v));
      this.villi.push(v);
    }
  }

  spawnMicrovilli() {
    this.microvilli = [];
    const specs = [
      { x: 900,  count: 5 },
      { x: 1300, count: 4 },
      { x: 1700, count: 6 },
      { x: 2150, count: 4 },
      { x: 2600, count: 5 },
      { x: 3050, count: 5 },
      { x: 3500, count: 4 },
      { x: 3950, count: 6 },
      { x: 4400, count: 4 },
      { x: 4800, count: 5 },
    ];
    for (const { x, count } of specs) {
      const mv = new Microvilli(this, x, FLOOR_Y, { spikeCount: count });
      for (const spike of mv.bodies) {
        this.physics.add.overlap(this.cheerio.sprite, spike, () => this.handleMicrovilliContact());
      }
      this.microvilli.push(mv);
    }
  }

  spawnNutrientOrbs() {
    this.orbs = [];
    // Orbs hover at jumpable heights — most are tempting risk
    // grabs floating above the floor near hazards.
    const specs = [
      { x: 780,  y: FLOOR_Y - 130 },
      { x: 1180, y: FLOOR_Y - 170 },
      { x: 1580, y: FLOOR_Y - 200 },
      { x: 2080, y: FLOOR_Y - 160 },
      { x: 2480, y: FLOOR_Y - 220 },
      { x: 2950, y: FLOOR_Y - 180 },
      { x: 3380, y: FLOOR_Y - 240 },
      { x: 3850, y: FLOOR_Y - 200 },
      { x: 4300, y: FLOOR_Y - 230 },
      { x: 4720, y: FLOOR_Y - 190 },
    ];
    for (const { x, y } of specs) {
      const orb = new NutrientOrb(this, x, y);
      this.physics.add.overlap(this.cheerio.sprite, orb.sprite, () => this.handleOrbPickup(orb));
      this.orbs.push(orb);
    }
  }

  spawnFiberToken() {
    // Tucked at the end of the path, just before the exit, so the
    // player has to thread the final ramp-up speed section to grab
    // it. Lifted high — risk to grab.
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
    // A faint red strip on the left edge that brightens as the
    // cheerio creeps toward the camera's left edge — fast,
    // legible feedback that you're about to die.
    this.warning = this.add.rectangle(0, GAME_HEIGHT / 2, 100, GAME_HEIGHT, 0xff4040, 0)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
  }

  // --- Bile injection event (per design §6.4) -------------------

  spawnBileInjector() {
    // Bile from the pancreas: a screen-wide chartreuse wave at
    // chest height that the player must duck under (= stay
    // grounded on the floor). Anyone mid-air during ACTIVE gets
    // hit. Cycle: idle (5s) → telegraph (rumble + warning 1.4s)
    // → active sweep (1.4s) → idle again.
    this.bilePhase = 'idle';
    this.bilePhaseAt = this.time.now;
    this.bileDurations = { idle: 5000, telegraph: 1400, active: 1400 };
    this.bileDangerY = 440;
    this.bileDangerH = 56;

    // Wave is camera-locked so it sweeps the visible viewport.
    this.bileWave = this.add.rectangle(GAME_WIDTH + 100, this.bileDangerY, 1500, this.bileDangerH, 0xc8ff60)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    // Full-screen translucent green overlay flashing during the
    // telegraph window — visual "DUCK" cue.
    this.bileTelegraph = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xc8ff60, 0)
      .setScrollFactor(0);

    this.bileWarningText = this.add.text(GAME_WIDTH / 2, 130, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#c8ff60', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
  }

  updateBile() {
    const elapsed = this.time.now - this.bilePhaseAt;
    const dur = this.bileDurations[this.bilePhase];

    if (this.bilePhase === 'idle') {
      this.bileTelegraph.setAlpha(0);
      this.bileWarningText.setText('');
      this.bileWave.setAlpha(0);
      if (elapsed >= dur) {
        this.bilePhase = 'telegraph';
        this.bilePhaseAt = this.time.now;
      }
    } else if (this.bilePhase === 'telegraph') {
      const pulse = 0.15 + 0.15 * Math.sin(this.time.now / 60);
      this.bileTelegraph.setAlpha(pulse);
      this.bileWarningText.setText('BILE INCOMING — STAY ON THE FLOOR!');
      this.cameras.main.shake(60, 0.002);
      if (elapsed >= dur) {
        this.bilePhase = 'active';
        this.bilePhaseAt = this.time.now;
        this.bileWave.x = GAME_WIDTH + 100;
        this.bileWave.setAlpha(0.85);
      }
    } else if (this.bilePhase === 'active') {
      this.bileTelegraph.setAlpha(0);
      this.bileWarningText.setText('');
      const t = Phaser.Math.Clamp(elapsed / dur, 0, 1);
      this.bileWave.x = (GAME_WIDTH + 100) - t * (GAME_WIDTH + 1700);
      // Hit check uses SCREEN-space x because the wave is
      // scroll-factor-0.
      const cheerioScreenX = this.cheerio.x - this.cameras.main.scrollX;
      const cheerioHalf = this.cheerio.sprite.displayWidth / 2;
      const inXRange = cheerioScreenX + cheerioHalf > this.bileWave.x
        && cheerioScreenX - cheerioHalf < this.bileWave.x + this.bileWave.width;
      const cBottom = this.cheerio.body.bottom;
      const cTop = cBottom - this.cheerio.sprite.displayHeight;
      const bileTop = this.bileDangerY - this.bileDangerH / 2;
      const bileBottom = this.bileDangerY + this.bileDangerH / 2;
      const inYRange = cTop < bileBottom && cBottom > bileTop;
      if (inXRange && inYRange) this.applyHitToCheerio();
      if (elapsed >= dur) {
        this.bilePhase = 'idle';
        this.bilePhaseAt = this.time.now;
      }
    }
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

    // Advance the auto-scroller camera. Speed ramps linearly from
    // BASE to PEAK over the room's length.
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

    // Off-screen-left death + warning ramp-up. The cheerio's right
    // edge must stay past the camera's left edge + margin.
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
    this.updateBile();
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
