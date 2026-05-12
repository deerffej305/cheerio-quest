import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import ConstipationBlocker from '../entities/hazards/ConstipationBlocker.js';
import PoopDisplacer from '../entities/enemies/PoopDisplacer.js';

// Room 6 — Anus (The Constipation Maze). Final room. The player
// navigates the maze and stands on the one exit tile when a fart
// fires to be launched into the toilet.
//
// Fart cycle: a periodic warning (3-2-1 countdown) followed by a
// fart event. If the cheerio is on the exit tile during the fart,
// they win. Otherwise: displacement only, no damage — wait for the
// next fart.
//
// Fiber bonus: more fiber tokens collected → faster fart cycle.
// On-screen educational label explains this when active.

const ROOM_WIDTH = 1280;
const ROOM_HEIGHT = 720;
const FLOOR_Y = 620;
const SPAWN_X = 100;
const SPAWN_Y = 540;

const FART_BASE_PERIOD = 8000;   // ms between farts at 0 fiber
const FART_FIBER_BONUS = 700;    // ms shaved off period per fiber, min 2500
const FART_MIN_PERIOD = 2500;
const COUNTDOWN_MS = 3000;       // 3-2-1 telegraph window

export default class RoomAnus extends Phaser.Scene {
  constructor() {
    super('RoomAnus');
  }

  create() {
    this.phase = 'play';
    this.cameras.main.setBackgroundColor('#3a1a08');
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    this.inputs = new InputManager(this);
    this.platforms = this.physics.add.staticGroup();

    this.buildMaze();
    this.spawnCheerio();
    this.spawnBlockers();
    this.spawnPoopDisplacers();
    this.spawnExitTile();
    this.spawnHud();
    this.startFartCycle();

    this.bindEsc();
    this.scene.get('Hud')?.setRoomLabel('Room 6 — Anus (final!)');
  }

  // --- Maze geometry ---------------------------------------------

  buildMaze() {
    // Floor.
    const ground = this.add.rectangle(ROOM_WIDTH / 2, FLOOR_Y + 40, ROOM_WIDTH, 80, 0x5a2a14);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Ceiling.
    const roof = this.add.rectangle(ROOM_WIDTH / 2, 20, ROOM_WIDTH, 40, 0x3a1a08);
    this.physics.add.existing(roof, true);
    this.platforms.add(roof);

    // Side walls.
    const leftWall = this.add.rectangle(20, ROOM_HEIGHT / 2, 40, ROOM_HEIGHT, 0x3a1a08);
    this.physics.add.existing(leftWall, true);
    this.platforms.add(leftWall);
    const rightWall = this.add.rectangle(ROOM_WIDTH - 20, ROOM_HEIGHT / 2, 40, ROOM_HEIGHT, 0x3a1a08);
    this.physics.add.existing(rightWall, true);
    this.platforms.add(rightWall);

    // Maze ledges — a few platforms forming corridors. The player
    // can climb up/down between them. The last entry is the
    // "exit perch" in the upper-right corner: the highest spot in
    // the room and the destination during a fart.
    const ledges = [
      { x: 280, y: 470, w: 200 },
      { x: 540, y: 360, w: 200 },
      { x: 820, y: 470, w: 200 },
      { x: 1080, y: 360, w: 160 },
      { x: 380, y: 250, w: 160 },
      { x: 700, y: 200, w: 160 },
      { x: 980, y: 250, w: 160 },
      { x: 1130, y: 140, w: 150 }, // upper-right exit perch
    ];
    for (const { x, y, w } of ledges) {
      const p = this.add.rectangle(x, y, w, 18, 0x6a3010);
      this.physics.add.existing(p, true);
      this.platforms.add(p);
    }
  }

  // --- Cheerio ----------------------------------------------------

  spawnCheerio() {
    this.cheerio = new Cheerio(this, SPAWN_X, SPAWN_Y);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);
    this.cameras.main.startFollow(this.cheerio.sprite, true, 0.2, 0.2);
  }

  // --- Constipation blockers (pushable + static) ------------------

  spawnBlockers() {
    this.blockers = [];
    const specs = [
      { x: 460, y: FLOOR_Y - 20, pushable: false },
      { x: 760, y: FLOOR_Y - 20, pushable: true },
      { x: 920, y: FLOOR_Y - 20, pushable: false },
    ];
    for (const { x, y, pushable } of specs) {
      const b = new ConstipationBlocker(this, x, y, { pushable });
      this.physics.add.collider(this.cheerio.sprite, b.sprite);
      if (pushable) this.physics.add.collider(b.sprite, this.platforms);
      this.blockers.push(b);
    }
  }

  // --- Poop displacers (patrolling shovers) ----------------------

  spawnPoopDisplacers() {
    // Patrol every ledge and the open floor sections. No damage on
    // contact — just shove the cheerio in the displacer's direction
    // of motion with a small upward pop, per the design's
    // "displacement only" rule. Density is intentionally heavy: the
    // maze should feel crowded so positioning for the exit tile is
    // a real timing problem.
    this.displacers = [];
    const specs = [
      // Lower-tier ledges + floor
      { x: 280, y: 450, range: [200, 360] },    // ledge 1 (low-left)
      { x: 200, y: 600, range: [60, 420] },     // floor far-left strip
      { x: 820, y: 450, range: [740, 900] },    // ledge 3 (low-right)
      { x: 620, y: 600, range: [500, 740] },    // floor between blockers
      { x: 1100, y: 600, range: [960, 1240] },  // floor far-right
      // Mid-tier ledges (y=360)
      { x: 540, y: 340, range: [460, 620] },    // ledge 2 (mid)
      { x: 1080, y: 340, range: [1020, 1140] }, // ledge 4 (mid-right, climb path)
      // Top-tier ledges (y=200..250)
      { x: 380, y: 230, range: [320, 440] },    // ledge 5 (high-left)
      { x: 700, y: 170, range: [640, 760] },    // ledge 6 (highest)
      { x: 980, y: 230, range: [920, 1040] },   // ledge 7 (top-right)
    ];
    for (const { x, y, range } of specs) {
      const d = new PoopDisplacer(this, x, y, { rangeLeft: range[0], rangeRight: range[1] });
      this.physics.add.collider(d.sprite, this.platforms);
      this.physics.add.collider(this.cheerio.sprite, d.sprite, () => this.handleDisplacerContact(d));
      this.displacers.push(d);
    }
  }

  handleDisplacerContact(d) {
    if (!d.alive || !this.cheerio.alive) return;
    // Stomping does nothing — these aren't damageable enemies, and
    // they aren't damaging in return. Just shove. applyDisplacement
    // holds the player's input-driven velocity reset off for the
    // shove window so the push actually carries.
    const direction = d.isMovingRight() ? 1 : -1;
    const popVy = this.cheerio.body.blocked.down ? -220 : null;
    this.cheerio.applyDisplacement(direction * 360, popVy, 320);
  }

  // --- Exit tile (the one safe spot during a fart) ---------------

  spawnExitTile() {
    // Exit tile sits on top of the upper-right exit perch (the
    // highest platform in the room). Visually a glowing green pad
    // hovering just above the perch's surface.
    this.exitTileX = 1130;
    this.exitTileY = 131;       // top of perch is y = 140 - 9 = 131
    this.exitTile = this.add.rectangle(this.exitTileX, this.exitTileY - 6, 80, 8, 0xa0ffa0);
    this.exitTile.setStrokeStyle(2, 0x40ff80);

    this.add.text(this.exitTileX, this.exitTileY - 26, 'EXIT TILE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#a0ffa0', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Pulse animation so the exit reads as "the safe place".
    this.tweens.add({
      targets: this.exitTile,
      alpha: 0.45,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  // --- In-room HUD: fart countdown + fiber bonus label ------------

  spawnHud() {
    this.countdownText = this.add.text(GAME_WIDTH / 2, 70, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '40px', color: '#ffd060', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);

    // Fiber-bonus educational label — explains why more fiber means
    // more farts, per the design's "the whole game justifies fiber".
    const fiberCount = scoreManager.fiberCount;
    const bonusText = fiberCount > 0
      ? `Fiber bonus: ${fiberCount} token${fiberCount > 1 ? 's' : ''} collected → faster farts!`
      : 'No fiber tokens collected — slow farts. Fiber helps you poop!';
    this.add.text(GAME_WIDTH / 2, 110, bonusText, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffd0a8',
    }).setOrigin(0.5).setScrollFactor(0);
  }

  // --- Fart cycle -------------------------------------------------

  fartPeriod() {
    const f = scoreManager.fiberCount;
    return Math.max(FART_MIN_PERIOD, FART_BASE_PERIOD - f * FART_FIBER_BONUS);
  }

  startFartCycle() {
    this.nextFartAt = this.time.now + this.fartPeriod();
  }

  triggerFart() {
    // Check if the cheerio is standing on the exit perch when the
    // fart fires. The green tile is a visual marker floating above
    // the perch surface; what matters is the cheerio's body bottom
    // resting on the perch top at y ≈ 131 — within ±20 px.
    const dx = Math.abs(this.cheerio.x - this.exitTileX);
    const perchTop = this.exitTileY;
    const onTile = dx < 50
      && this.cheerio.body.bottom > perchTop - 4
      && this.cheerio.body.bottom < perchTop + 20;

    if (onTile) {
      this.launchVictory();
    } else {
      this.displaceCheerio();
      this.nextFartAt = this.time.now + this.fartPeriod();
    }
  }

  displaceCheerio() {
    // No damage — just shove the cheerio in a random horizontal
    // direction and pop them up. Player scrambles to recover.
    const direction = Math.random() < 0.5 ? -1 : 1;
    this.cheerio.body.setVelocityX(direction * 240);
    this.cheerio.body.setVelocityY(-260);
    this.hud()?.flash('PFFT! missed the fart — scramble back!', 1400);
  }

  launchVictory() {
    if (this.phase !== 'play') return;
    this.phase = 'won';
    this.cheerio.freezeControl(true);
    this.cheerio.body.setAllowGravity(false);
    // Launch the cheerio up and to the right in a triumphant arc.
    this.tweens.add({
      targets: this.cheerio.sprite,
      x: ROOM_WIDTH - 40,
      y: 80,
      angle: 540,
      duration: 1100,
      ease: 'Cubic.Out',
    });
    this.hud()?.flash('💨 LAUNCHED INTO THE TOILET!', 2200);
    this.time.delayedCall(1200, () => this.showCredits());
  }

  showCredits() {
    // Final freeze-frame in the toilet bowl + score recap.
    const cx = GAME_WIDTH / 2;
    const dim = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setScrollFactor(0);
    this.add.text(cx, 140, 'YOU MADE IT!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '54px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(cx, 220, 'A Cheerio\'s journey, complete.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#e0c8ff', fontStyle: 'italic',
    }).setOrigin(0.5).setScrollFactor(0);

    const stats = [
      `Final score: ${scoreManager.points}`,
      `Fiber tokens collected: ${scoreManager.fiberCount} / 6`,
      `Questions correct: ${scoreManager.questionsCorrect}`,
    ];
    stats.forEach((s, i) => {
      this.add.text(cx, 320 + i * 36, s, {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0);
    });

    this.add.text(cx, GAME_HEIGHT - 80, 'Press Esc to return to Title.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#aaaaaa',
    }).setOrigin(0.5).setScrollFactor(0);
  }

  // --- Frame loop -------------------------------------------------

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);
    if (this.phase !== 'play') return;

    for (const d of this.displacers) d.update();

    const remaining = this.nextFartAt - this.time.now;
    if (remaining <= COUNTDOWN_MS && remaining > 0) {
      const secs = Math.ceil(remaining / 1000);
      this.countdownText.setText(`FART IN ${secs}…`);
    } else if (remaining <= 0) {
      this.countdownText.setText('');
      this.triggerFart();
    } else {
      this.countdownText.setText('');
    }
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
