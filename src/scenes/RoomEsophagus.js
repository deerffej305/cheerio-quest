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
const ROOM_HEIGHT = 5200;
const SPAWN_X = GAME_WIDTH / 2;                    // 640
const SPAWN_Y = 120;
const EXIT_Y = ROOM_HEIGHT - 120;                  // 5080

// Cheerio's terminal velocity in the tube. Significantly faster than
// waveSpeed so a clean straight-down fall comfortably clears the exit.
// Hitting rings/platforms costs enough seconds that the wave can catch.
const ESOPHAGUS_TERMINAL_VY = 480;

// Axis-aligned bounding-box overlap for Phaser arcade Body objects.
// Used per frame to decide push-vs-crush against the two halves of
// each muscle ring; Phaser's add.overlap callbacks fire as events
// rather than letting us check "both sides simultaneously."
function aabbOverlap(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

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
    // Background — the painted esophagus, walls and lumen included.
    // Cowork shipped it at 1280x3200; we scale to GAME_WIDTH x
    // ROOM_HEIGHT so the muscle texture spans the full level.
    const bg = this.add.image(GAME_WIDTH / 2, ROOM_HEIGHT / 2, 'room-esophagus-bg');
    bg.setDisplaySize(GAME_WIDTH, ROOM_HEIGHT);
    bg.setDepth(-10);

    // Left and right walls of the tube. Invisible hitboxes; the
    // wall art is painted into the background.
    const leftWall = this.add.rectangle(
      TUBE_LEFT / 2,
      ROOM_HEIGHT / 2,
      TUBE_LEFT,
      ROOM_HEIGHT,
      0x4a1020,
    ).setVisible(false);
    this.physics.add.existing(leftWall, true);
    this.platforms.add(leftWall);

    const rightWallW = GAME_WIDTH - TUBE_RIGHT;
    const rightWall = this.add.rectangle(
      TUBE_RIGHT + rightWallW / 2,
      ROOM_HEIGHT / 2,
      rightWallW,
      ROOM_HEIGHT,
      0x4a1020,
    ).setVisible(false);
    this.physics.add.existing(rightWall, true);
    this.platforms.add(rightWall);

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
    const startY = 600;
    const endY = EXIT_Y - 360;
    const spacing = 450;
    const ringCount = Math.floor((endY - startY) / spacing) + 1;

    for (let i = 0; i < ringCount; i++) {
      const y = startY + i * spacing;
      const gapMin = TUBE_LEFT + 90;
      const gapMax = TUBE_RIGHT - 90;
      const gapX = Phaser.Math.Between(gapMin, gapMax);
      const ring = new PeristalsisRing(this, y, TUBE_LEFT, TUBE_RIGHT, gapX, {
        gapWidth: 140,
        thickness: 66,
      });
      this.physics.add.collider(this.cheerio.sprite, ring.leftSeg);
      this.physics.add.collider(this.cheerio.sprite, ring.rightSeg);
      this.rings.push(ring);
    }
  }

  spawnCrushers() {
    // The whole esophageal wall is muscle. Crusher segments tile both
    // walls floor-to-ceiling with no gaps — each segment is a "rib".
    // A single waveY descends through the tube (see updateWave); each
    // segment closes briefly as the wave passes its y, retracts as
    // the wave moves below. Same threat as the original descending
    // death-line, visualized as a wave of inward squeezes.
    this.crushers = [];
    const thickness = 150;
    const stackTop = 360;
    const stackBottom = ROOM_HEIGHT - 200;
    const count = Math.ceil((stackBottom - stackTop) / thickness);
    for (let i = 0; i < count; i++) {
      const y = stackTop + i * thickness + thickness / 2;
      const crusher = new PeristalsisCrusher(this, y, TUBE_LEFT, TUBE_RIGHT, { thickness });
      this.crushers.push(crusher);
    }
    // (Crusher contact resolution happens per-frame in
    // resolveCrushers — one side touches = push, both sides at once
    // = crush. Overlap callbacks aren't precise enough for that.)

    // Wave state — descends from above the tube. One pass only; once
    // the wave reaches the bottom, every segment is locked closed.
    this.waveY = -400;
    this.waveSpeed = 360; // px/s — below Cheerio terminal so a clean fall is safe
    this.waveStopY = ROOM_HEIGHT + 400;
  }

  spawnFiberToken() {
    // Fiber sits on top of one of the middle walkable rings. Reaching
    // it just requires landing on the ring's solid segment — no risky
    // side-branch.
    const target = this.rings[Math.floor(this.rings.length / 2)];
    const fiberX = target.leftSeg.x - target.leftSeg.width / 2 + 30;
    const fiberY = target.y - 32;
    this.fiberToken = new FiberToken(this, fiberX, fiberY);
    this.physics.add.overlap(this.cheerio.sprite, this.fiberToken.sprite, () => this.handleFiberPickup());
  }

  updateWave(dt) {
    if (this.phase !== 'play') return;
    // Wave is one-way. After it passes the bottom, every segment has
    // locked closed — no need to keep advancing.
    if (this.waveY < this.waveStopY) {
      this.waveY += this.waveSpeed * (dt / 1000);
    }

    // Distance relative to waveY (positive = wave hasn't reached yet):
    //   d > TELEGRAPH_DIST → idle  (just baseExtension visible)
    //   d in [closeAt, TELEGRAPH_DIST] → telegraph (yellow, extending in)
    //   d <= closeAt → closed (deadly, locks shut)
    // Telegraph window is large so the inward squeeze is gradual,
    // even though the wave itself moves at full waveSpeed.
    const TELEGRAPH_DIST = 520;
    const closeAt = 30;

    let lockedThisFrame = false;
    let firstTelegraphThisFrame = false;
    for (const c of this.crushers) {
      if (c.locked) {
        c.setState(c.maxReach, 'closed');
        continue;
      }
      const wasIdle = !c._telegraphStarted;
      const d = c.y - this.waveY;
      if (d > TELEGRAPH_DIST) {
        c.setState(c.baseExtension, 'idle');
      } else if (d > closeAt) {
        const k = 1 - (d - closeAt) / (TELEGRAPH_DIST - closeAt);
        c.setState(c.baseExtension + (c.maxReach - c.baseExtension) * k, 'telegraph');
        if (wasIdle) {
          c._telegraphStarted = true;
          firstTelegraphThisFrame = true;
        }
      } else {
        c.setState(c.maxReach, 'closed');
        lockedThisFrame = true;
      }
    }
    // One sound max per frame even if multiple segments lock/start
    // — otherwise 31 stacked segments could overlap a thunderclap.
    if (lockedThisFrame) sound.play('crunch');
    else if (firstTelegraphThisFrame) sound.play('squelch');
  }

  showHazardCaption() {
    const note = this.add.text(GAME_WIDTH / 2, 90, 'PERISTALSIS — fall through ahead of the wave!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffb0b8', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: note, alpha: 0, delay: 4000, duration: 700,
      onComplete: () => note.destroy() });
  }

  resolveCrushers() {
    if (this.phase !== 'play' || !this.cheerio?.alive) return;
    const cb = this.cheerio.sprite.body;
    for (const c of this.crushers) {
      if (!c.alive) continue;
      const lb = c.leftBlock.body;
      const rb = c.rightBlock.body;
      // Skip cheap idle case: both sides retracted to baseExtension.
      if (lb.width <= c.baseExtension + 1 && rb.width <= c.baseExtension + 1) continue;

      const touchesLeft = aabbOverlap(cb, lb);
      const touchesRight = aabbOverlap(cb, rb);

      if (touchesLeft && touchesRight) {
        // Both sides squeezing — crushed.
        this.handleCrunchDeath();
        return;
      }
      if (touchesLeft) {
        // Left wall is pushing — shove cheerio rightward.
        this.cheerio.applyDisplacement(420, null, 140);
      } else if (touchesRight) {
        // Right wall is pushing — shove cheerio leftward.
        this.cheerio.applyDisplacement(-420, null, 140);
      }
    }
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

    this.updateWave(delta);
    this.resolveCrushers();

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
