import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import PeristalsisRing from '../entities/hazards/PeristalsisRing.js';
import PeristalsisCrusher from '../entities/hazards/PeristalsisCrusher.js';
import FiberToken from '../entities/FiberToken.js';
import { sound } from '../systems/SoundManager.js';

const TUBE_W = 600;
const TUBE_LEFT = (GAME_WIDTH - TUBE_W) / 2;       // 340
const TUBE_RIGHT = TUBE_LEFT + TUBE_W;             // 940
const ROOM_HEIGHT = 3200;
const SPAWN_X = GAME_WIDTH / 2;                    // 640
const SPAWN_Y = 120;
const EXIT_Y = ROOM_HEIGHT - 120;                  // 3080

// Cheerio's terminal velocity in the tube. With the crusher hazard
// model the player isn't racing a death-line — they just need to time
// drops through the open phase of each crusher. 275 keeps falls
// readable without feeling sluggish.
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
    this.spawnMucusPatches();
    this.spawnCrushers();
    this.spawnFiberToken();
    this.spawnExit();
    this.showHazardCaption();
    this.bindEsc();
    this.startBurpCycle();

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
    // Solid platform pairs spaced through the tube. Crispy can land
    // on them or walk off the edge into the gap to keep falling.
    // No damage — they're just walkable rest spots between crushers.
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
        thickness: 22,
      });
      this.physics.add.collider(this.cheerio.sprite, ring.leftSeg);
      this.physics.add.collider(this.cheerio.sprite, ring.rightSeg);
      this.rings.push(ring);
    }
  }

  spawnCrushers() {
    // Peristalsis crushers — paired blocks that extend from the walls
    // and meet in the middle on a timer. Touching one during the
    // closed phase = death. They sit between the walkable rings so
    // each ring becomes a "wait here for the crusher to retract" beat.
    this.crushers = [];
    const crusherYs = [620, 980, 1380, 1780, 2180, 2580];
    crusherYs.forEach((y, i) => {
      const crusher = new PeristalsisCrusher(this, y, TUBE_LEFT, TUBE_RIGHT, {
        period: 2400 + (i % 2) * 400,             // alternate cadence
        closedDuration: 600,
        telegraphDuration: 500,
        phaseOffset: i * 700,                     // stagger so they're not synced
      });
      this.physics.add.overlap(this.cheerio.sprite, crusher.leftBlock, () => this.handleCrusherHit(crusher));
      this.physics.add.overlap(this.cheerio.sprite, crusher.rightBlock, () => this.handleCrusherHit(crusher));
      this.crushers.push(crusher);
    });
  }

  spawnFiberToken() {
    // Fiber sits on top of one of the middle walkable rings. Reaching
    // it just requires landing on the ring's solid segment — no risky
    // side-branch.
    const target = this.rings[3];
    const fiberX = target.leftSeg.x - target.leftSeg.width / 2 + 30;
    const fiberY = target.y - 32;
    this.fiberToken = new FiberToken(this, fiberX, fiberY);
    this.physics.add.overlap(this.cheerio.sprite, this.fiberToken.sprite, () => this.handleFiberPickup());
  }

  showHazardCaption() {
    const note = this.add.text(GAME_WIDTH / 2, 90, 'PERISTALSIS — time the squeeze, fall through when open!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffb0b8', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: note, alpha: 0, delay: 4000, duration: 700,
      onComplete: () => note.destroy() });
  }

  handleCrusherHit(crusher) {
    if (this.phase !== 'play') return;
    if (!crusher.isDeadly()) return;
    this.handleCrunchDeath();
  }

  handleCrunchDeath() {
    if (this.phase === 'dying') return;
    this.phase = 'dying';
    scoreManager.payDeathPenalty();
    this.cheerio.die('squish');
    this.hud()?.flash('CRUNCHED!  -20  RESTART', 1200);
    sound.play('death');
    this.time.delayedCall(1100, () => this.scene.restart());
  }

  // --- Mucus speed-boost patches ----------------------------------

  spawnMucusPatches() {
    // Per design §6.2: "Mucus stream patches along the wall = speed
    // boost. Slide down faster." Patches are slick blue-green
    // vertical strips. Touching one lifts the cheerio's terminal
    // velocity briefly so they shoot downward.
    this.mucusPatches = [];
    const patchSpecs = [
      { side: 'left',  y: 820,  h: 140 },
      { side: 'right', y: 1200, h: 160 },
      { side: 'left',  y: 1550, h: 120 },
      { side: 'right', y: 2350, h: 160 },
      { side: 'left',  y: 2700, h: 140 },
    ];
    for (const { side, y, h } of patchSpecs) {
      const x = side === 'left' ? TUBE_LEFT + 12 : TUBE_RIGHT - 12;
      const patch = this.add.rectangle(x, y, 18, h, 0x60d0d0, 0.7);
      patch.setStrokeStyle(2, 0x40b0b0, 0.9);
      this.physics.add.existing(patch, true);
      this.physics.add.overlap(this.cheerio.sprite, patch, () => this.applyMucusBoost());
      this.mucusPatches.push(patch);
    }
  }

  applyMucusBoost() {
    // Bump the cheerio's max-vy ceiling for ~400ms so they accelerate
    // past the normal terminal. Reset back on a timer.
    const boostedMaxVy = 720;
    const body = this.cheerio.body;
    body.setMaxVelocity(body.maxVelocity.x, boostedMaxVy);
    body.setVelocityY(Math.max(body.velocity.y, 520));
    if (this._mucusResetTimer) this._mucusResetTimer.remove(false);
    this._mucusResetTimer = this.time.delayedCall(400, () => {
      this.cheerio.body.setMaxVelocity(body.maxVelocity.x, ESOPHAGUS_TERMINAL_VY);
    });
  }

  // --- Burp event -------------------------------------------------

  startBurpCycle() {
    // Per design §6.2: "Burp event — on a timer. If the player has
    // been in the room too long, a burp wave pushes them upward
    // briefly, costing time." Fires once per N seconds while in
    // play; resets after each burp.
    this.nextBurpAt = this.time.now + 18000; // first burp ~18s in
  }

  triggerBurp() {
    if (this.phase !== 'play' || !this.cheerio.alive) return;
    // Visual: a yellow shockwave at the current camera y, sweeping
    // up. Mechanical: shove the cheerio upward briefly.
    const camY = this.cameras.main.scrollY + GAME_HEIGHT - 60;
    const wave = this.add.rectangle(GAME_WIDTH / 2, camY, TUBE_W - 4, 36, 0xffd060, 0.85);
    wave.setStrokeStyle(3, 0xff9020);
    this.tweens.add({
      targets: wave,
      y: camY - 900,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.Out',
      onComplete: () => wave.destroy(),
    });
    this.cheerio.applyDisplacement(0, -540, 450);
    sound.play('fart');
    this.hud()?.flash('BUUUURP! shoved back up', 1400);
    this.nextBurpAt = this.time.now + 14000;
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

    if (this.crushers) {
      for (const c of this.crushers) c.update(delta);
    }

    // Burp timer.
    if (this.phase === 'play' && this.time.now >= this.nextBurpAt) {
      this.triggerBurp();
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
    sound.play('room-clear');
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
    const openPause = () => {
      this.scene.pause();
      this.scene.launch('Pause', { pausedSceneKey: this.scene.key });
    };
    this.input.keyboard.on('keydown-ESC', openPause);
    this.input.keyboard.on('keydown-P', openPause);
  }
}
