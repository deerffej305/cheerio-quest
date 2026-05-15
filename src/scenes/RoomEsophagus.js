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

// Cheerio's terminal velocity in the tube. Free-fall is faster
// than the descending crunch wave (CRUNCH_SPEED), so a player who
// keeps moving stays comfortably ahead of it. Standing on a
// platform drops vy to 0, which lets the wave close.
const ESOPHAGUS_TERMINAL_VY = 320;

// Peristalsis crunch wave settings. The wave is the death-line:
// touching it = die. It always sits at most MAX_LEAD pixels above
// Crispy (so it's always visible), and descends at CRUNCH_SPEED
// independent of his motion. Camping a platform for ~MAX_LEAD /
// CRUNCH_SPEED seconds is your budget before the wave touches you.
const CRUNCH_SPEED = 200;
const CRUNCH_MAX_LEAD = 480;

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
    this.spawnBranchFolds();
    this.spawnFiberToken();
    this.spawnExit();
    this.spawnCrunchWave();
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
    // No damage — the real threat is the descending crunch wave
    // (see spawnCrunchWave / updateCrunchWave below). Landing here
    // is fine if you keep moving; camping = the wave catches up.
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

  spawnFiberToken() {
    // Fiber lives inside the riskier left-hand branch fold. The
    // fold pinches the lane tight (less room to dodge the ring
    // gap below) — that's the risk part of the risk-reward.
    this.fiberToken = new FiberToken(this, TUBE_LEFT + 60, 1820);
    this.physics.add.overlap(this.cheerio.sprite, this.fiberToken.sprite, () => this.handleFiberPickup());
  }

  // --- Peristalsis crunch wave (the descending death line) -------

  spawnCrunchWave() {
    // A thick red bar that spans the tube and chases Crispy from
    // above. Renders the upper portion of the tube above the bar
    // tinted dark so it reads as "danger zone you can't go into".
    this.crunchY = -120; // start above the visible viewport
    this.crunchWave = this.add.rectangle(
      GAME_WIDTH / 2,
      this.crunchY,
      TUBE_W - 4,
      32,
      0xff3050,
    );
    this.crunchWave.setStrokeStyle(3, 0xff8090);

    // A subtler "crunch zone" above the wave so the player sees
    // the lethal area, not just the leading edge.
    this.crunchZone = this.add.rectangle(
      GAME_WIDTH / 2,
      this.crunchY - 200,
      TUBE_W - 4,
      400,
      0x801020,
      0.45,
    ).setOrigin(0.5, 1);

    // Educational caption that fades after a few seconds.
    const note = this.add.text(GAME_WIDTH / 2, 90, 'PERISTALSIS — keep falling or get crunched!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffb0b8', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: note, alpha: 0, delay: 3500, duration: 700,
      onComplete: () => note.destroy() });
  }

  updateCrunchWave(dt) {
    if (this.phase !== 'play') return;
    // Steady descent — independent of Crispy. Tether to a max lead
    // above him so the wave is always a visible threat (otherwise
    // a fast faller would leave the wave forever behind).
    this.crunchY += CRUNCH_SPEED * (dt / 1000);
    const cap = this.cheerio.y - CRUNCH_MAX_LEAD;
    if (this.crunchY < cap) this.crunchY = cap;

    this.crunchWave.y = this.crunchY;
    this.crunchZone.y = this.crunchY;

    // Crispy's body top is what gets caught.
    const cheerioTop = this.cheerio.y - this.cheerio.sprite.displayHeight / 2;
    if (this.crunchY >= cheerioTop) {
      this.handleCrunchDeath();
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

  // --- Mucus speed-boost patches ----------------------------------

  spawnMucusPatches() {
    // Per design §6.2: "Mucus stream patches along the wall = speed
    // boost. Slide down faster." Patches are slick blue-green
    // vertical strips. Touching one lifts the cheerio's terminal
    // velocity briefly so they shoot downward.
    this.mucusPatches = [];
    const patchSpecs = [
      { side: 'left',  y: 720,  h: 140 },
      { side: 'right', y: 1100, h: 160 },
      { side: 'left',  y: 1450, h: 120 },
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

  // --- Branching folds --------------------------------------------

  spawnBranchFolds() {
    // Mid-tube the lumen pinches into two narrower paths. A vertical
    // wall in the middle creates a left lane (riskier — hides the
    // fiber) and a right lane (safer, plain).
    const branchTop = 1700;
    const branchBot = 2000;
    const dividerH = branchBot - branchTop;
    const divider = this.add.rectangle(
      GAME_WIDTH / 2,
      (branchTop + branchBot) / 2,
      36,
      dividerH,
      0x8a2a3a,
    );
    divider.setStrokeStyle(2, 0x4a1820);
    this.physics.add.existing(divider, true);
    this.platforms.add(divider);

    // Decorative fold lips poking inward at the branch entrance —
    // visual hint that "the path splits here".
    const lipTopL = this.add.rectangle(TUBE_LEFT + 50, branchTop - 8, 100, 14, 0x882044);
    const lipTopR = this.add.rectangle(TUBE_RIGHT - 50, branchTop - 8, 100, 14, 0x882044);
    this.physics.add.existing(lipTopL, true);
    this.physics.add.existing(lipTopR, true);
    this.platforms.add(lipTopL);
    this.platforms.add(lipTopR);

    this.add.text(GAME_WIDTH / 2 - 130, branchTop - 36, '← fiber', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#40d070',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2 + 130, branchTop - 36, 'safe →', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);
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

    // Peristalsis crunch wave — the death-line above Crispy.
    this.updateCrunchWave(delta);

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
