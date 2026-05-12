import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import FoodPlatform from '../entities/FoodPlatform.js';
import AcidDrop from '../entities/enemies/AcidDrop.js';
import AcidBall from '../entities/enemies/AcidBall.js';
import FiberToken from '../entities/FiberToken.js';
import { sound } from '../systems/SoundManager.js';

// Room 3 — Stomach. The largest, longest room in the game per the
// design doc. Cavernous space; acid pool at the bottom (instant
// restart, lava rule); pieces of food float above the acid as
// platforms, some of which dissolve when stood on too long.
//
// Hazards: acid drops patrol platforms (stompable, +5 pts), acid
// balls rise out of the acid like podoboos (not stompable),
// dissolving food platforms force the player to keep moving.

const ROOM_WIDTH = 3600;
const ACID_TOP_Y = GAME_HEIGHT - 80;          // 640 — top of the acid pool
const SPAWN_X = 90;
const SPAWN_Y = 200;
const EXIT_X = ROOM_WIDTH - 100;
const EXIT_Y = 420;

export default class RoomStomach extends Phaser.Scene {
  constructor() {
    super('RoomStomach');
  }

  create() {
    this.phase = 'play';
    this.cameras.main.setBackgroundColor('#4a1818');
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, GAME_HEIGHT);

    this.inputs = new InputManager(this);
    this.platforms = this.physics.add.staticGroup();

    this.buildAcidAndCeiling();
    this.spawnFoodPlatforms();
    this.spawnCheerio();
    this.spawnAcidDrops();
    this.spawnAcidBalls();
    this.spawnFiberToken();
    this.spawnExit();
    this.spawnPyloricSwitch();

    this.bindEsc();
    this.scene.get('Hud')?.setRoomLabel('Room 3 — Stomach');
  }

  // --- Static world geometry --------------------------------------

  buildAcidAndCeiling() {
    // Roof of the stomach (visual cap, also a collider so the
    // cheerio can't escape upward off the cameraless top).
    const roof = this.add.rectangle(ROOM_WIDTH / 2, 20, ROOM_WIDTH, 40, 0x5a2024);
    this.physics.add.existing(roof, true);
    this.platforms.add(roof);

    // Acid pool — bright orange-red strip at the bottom. Contact is
    // instant restart, no shrink intermediate (the lava rule).
    this.acid = this.add.rectangle(
      ROOM_WIDTH / 2,
      ACID_TOP_Y + (GAME_HEIGHT - ACID_TOP_Y) / 2,
      ROOM_WIDTH,
      GAME_HEIGHT - ACID_TOP_Y,
      0xff5028,
    );
    this.physics.add.existing(this.acid);
    this.acid.body.setAllowGravity(false);
    this.acid.body.setImmovable(true);
    // Make the acid wavy by tinting two overlay strips a slightly
    // darker color and giving them a subtle drift.
    this.add.rectangle(
      ROOM_WIDTH / 2,
      ACID_TOP_Y + 6,
      ROOM_WIDTH,
      8,
      0xffa830,
      0.8,
    );

    // Entry ledge on the left so the player has a place to land
    // when they drop in from the esophagus.
    const entry = this.add.rectangle(60, 270, 140, 18, 0xc4915a);
    this.physics.add.existing(entry, true);
    this.platforms.add(entry);
  }

  // --- Food platforms ---------------------------------------------

  spawnFoodPlatforms() {
    // Layout: a staggered path of food chunks across the stomach.
    // A few are marked dissolving = true so the player can't camp.
    // Heights span 220..560 so jumps are doable for both Big (217
    // px jump) and Small (96 px jump) cheerios.
    const specs = [
      { x: 260, y: 370, w: 130, dissolves: false },
      { x: 480, y: 320, w: 130, dissolves: true },
      { x: 680, y: 420, w: 130, dissolves: false },
      { x: 880, y: 350, w: 130, dissolves: true },
      { x: 1080, y: 470, w: 130, dissolves: false },
      { x: 1280, y: 380, w: 130, dissolves: true },
      { x: 1500, y: 320, w: 130, dissolves: false },
      { x: 1720, y: 460, w: 130, dissolves: true },
      { x: 1940, y: 360, w: 130, dissolves: false },
      { x: 2160, y: 430, w: 130, dissolves: true },
      { x: 2380, y: 360, w: 130, dissolves: false },
      { x: 2600, y: 470, w: 130, dissolves: true },
      { x: 2820, y: 380, w: 130, dissolves: false },
      { x: 3020, y: 430, w: 150, dissolves: false }, // landing pad before exit
    ];
    this.foodPlatforms = specs.map(({ x, y, w, dissolves }) =>
      new FoodPlatform(this, x, y, w, 18, { dissolves })
    );
  }

  // --- Cheerio + colliders ---------------------------------------

  spawnCheerio() {
    this.cheerio = new Cheerio(this, SPAWN_X, SPAWN_Y);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);
    for (const fp of this.foodPlatforms) {
      this.physics.add.collider(this.cheerio.sprite, fp.sprite, () => {
        if (this.cheerio.body.touching.down && fp.sprite.body.touching.up) {
          fp.noteCheerioStanding();
        }
      });
    }
    this.physics.add.overlap(this.cheerio.sprite, this.acid, () => this.handleAcidContact());
    this.cameras.main.startFollow(this.cheerio.sprite, true, 0.12, 0.12);
  }

  // --- Enemies ----------------------------------------------------

  spawnAcidDrops() {
    // Acid drops patrol the wider platforms. Each drop's range is
    // tied to its platform's x-span.
    this.acidDrops = [];
    const dropSpecs = [
      { platformIdx: 1, pad: 40 },
      { platformIdx: 4, pad: 40 },
      { platformIdx: 8, pad: 40 },
      { platformIdx: 11, pad: 40 },
    ];
    for (const { platformIdx, pad } of dropSpecs) {
      const fp = this.foodPlatforms[platformIdx];
      const drop = new AcidDrop(this, fp.sprite.x, fp.sprite.y - 20, {
        rangeLeft: fp.sprite.x - fp.sprite.width / 2 + pad,
        rangeRight: fp.sprite.x + fp.sprite.width / 2 - pad,
      });
      this.physics.add.collider(drop.sprite, this.platforms);
      this.physics.add.collider(drop.sprite, fp.sprite);
      this.physics.add.collider(this.cheerio.sprite, drop.sprite, () => this.handleAcidDropContact(drop));
      this.acidDrops.push(drop);
    }
  }

  spawnAcidBalls() {
    // Acid balls rise from the acid at fixed x positions through
    // the room. Phase offsets stagger their bubble-up timings.
    this.acidBalls = [];
    const ballSpecs = [
      { x: 600, offset: 0,    peak: 240 },
      { x: 1180, offset: 800, peak: 280 },
      { x: 1820, offset: 1600, peak: 260 },
      { x: 2480, offset: 2400, peak: 280 },
      { x: 2900, offset: 3200, peak: 240 },
    ];
    for (const { x, offset, peak } of ballSpecs) {
      const ball = new AcidBall(this, x, ACID_TOP_Y, { peakHeight: peak, phaseOffset: offset });
      this.physics.add.overlap(this.cheerio.sprite, ball.sprite, () => this.handleAcidBallContact(ball));
      this.acidBalls.push(ball);
    }
  }

  // --- Fiber token (risky, near the acid) -------------------------

  spawnFiberToken() {
    // Per design: "On a platform near the acid floor — risky to
    // reach." Plant it on a STABLE low food chunk (not a
    // dissolving one) so the pickup doesn't race the platform's
    // dissolve timer.
    const lowSpot = this.foodPlatforms[4]; // y=470, dissolves=false, near acid
    this.fiberToken = new FiberToken(this, lowSpot.sprite.x, lowSpot.sprite.y - 26);
    this.physics.add.overlap(this.cheerio.sprite, this.fiberToken.sprite, () => this.handleFiberPickup());
  }

  // --- Exit (pyloric sphincter) ----------------------------------

  spawnExit() {
    // Final landing pad + door on the right. Starts LOCKED behind
    // a giant acid bubble at the pylorus — the player has to
    // trigger the pyloric-sphincter switch elsewhere in the room
    // to retract the bubble and unlock the exit.
    this.exitDoor = this.add.rectangle(EXIT_X, EXIT_Y, 60, 120, 0x404040);
    this.exitLabel = this.add.text(EXIT_X, EXIT_Y - 80, 'PYLORUS\n(locked)', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ff8080', align: 'center',
    }).setOrigin(0.5);
    this.physics.add.existing(this.exitDoor);
    this.exitDoor.body.setAllowGravity(false);
    this.exitDoor.body.setImmovable(true);
    this.physics.add.overlap(this.cheerio.sprite, this.exitDoor, () => {
      if (this.exitUnlocked) this.completeRoom();
    });

    // Giant acid bubble blocking the exit.
    this.exitBubble = this.add.ellipse(EXIT_X, EXIT_Y, 110, 150, 0xff7028, 0.55);
    this.exitBubble.setStrokeStyle(3, 0xff5028);
    this.tweens.add({
      targets: this.exitBubble,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.exitUnlocked = false;
  }

  spawnPyloricSwitch() {
    // A switch platform tucked low and to the right of the room —
    // requires the player to drop down toward the acid, hit the
    // switch, then climb back up to the exit. Mini-boss flavor.
    const switchX = 2900;
    const switchY = 530;
    this.pyloricSwitch = this.add.rectangle(switchX, switchY, 80, 14, 0xffd060);
    this.pyloricSwitch.setStrokeStyle(2, 0xc09030);
    this.physics.add.existing(this.pyloricSwitch, true);
    this.add.text(switchX, switchY - 28, 'PYLORIC SWITCH', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#ffd060', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtle pulse so the switch reads as interactive.
    this.tweens.add({
      targets: this.pyloricSwitch,
      alpha: 0.6,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.physics.add.collider(this.cheerio.sprite, this.pyloricSwitch, () => {
      if (this.cheerio.body.touching.down && this.pyloricSwitch.body.touching.up) {
        this.activatePyloricSwitch();
      }
    });
  }

  activatePyloricSwitch() {
    if (this.exitUnlocked) return;
    this.exitUnlocked = true;
    this.pyloricSwitch.fillColor = 0x60ff60;
    this.pyloricSwitch.alpha = 1;
    this.tweens.killTweensOf(this.pyloricSwitch);

    // Retract the bubble.
    this.tweens.add({
      targets: this.exitBubble,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 500,
      onComplete: () => this.exitBubble.destroy(),
    });

    // Unlock the door visually.
    this.exitDoor.fillColor = 0x80ffa0;
    this.exitLabel.setText('PYLORUS →\n(open!)').setColor('#a0ffa0');
    this.hud()?.flash('Pyloric sphincter open! Run to the exit →', 1800);
    sound.playScore();
  }

  // --- Contact handlers ------------------------------------------

  handleAcidContact() {
    if (!this.cheerio.alive || this.phase === 'dying') return;
    this.hud()?.flash('DISSOLVED IN ACID!', 1200);
    this.cheerio.die();
    this.handleDeath();
  }

  handleAcidDropContact(drop) {
    if (!drop.alive || !this.cheerio.alive) return;
    const stomped = this.cheerio.body.touching.down && drop.sprite.body.touching.up;
    if (stomped) {
      drop.squash();
      scoreManager.addPoints(5);
      this.cheerio.body.setVelocityY(-400);
      sound.playStomp();
      this.hud()?.flash('+5');
    } else {
      this.applyHitToCheerio();
    }
  }

  handleAcidBallContact(ball) {
    if (!this.cheerio.alive || this.phase === 'dying') return;
    if (!ball.isDangerous()) return;
    this.applyHitToCheerio();
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

  applyHitToCheerio() {
    const outcome = this.cheerio.takeHit();
    if (outcome === 'shrunk') {
      this.hud()?.setSize('small');
      this.hud()?.flash('OUCH!');
    } else if (outcome === 'died') {
      this.handleDeath();
    }
  }

  handleDeath() {
    if (this.phase === 'dying') return;
    this.phase = 'dying';
    scoreManager.payDeathPenalty();
    this.hud()?.flash('-20  RESTART', 1200);
    this.time.delayedCall(1100, () => this.scene.restart());
  }

  completeRoom() {
    if (this.phase !== 'play') return;
    this.phase = 'won';
    this.cheerio.freezeControl(true);
    this.cheerio.body.setVelocity(0, 0);
    sound.playRoomClear();
    this.hud()?.flash('ROOM CLEARED — quiz time!', 1500);
    this.time.delayedCall(1600, () => {
      this.scene.start('Quiz', {
        room: 'stomach', nextScene: 'RoomSmallIntestine',
        cutsceneFrom: 'Stomach', cutsceneTo: 'Small Intestine',
      });
    });
  }

  // --- Frame loop -------------------------------------------------

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);
    if (this.phase !== 'play') return;
    for (const drop of this.acidDrops) drop.update();
    for (const ball of this.acidBalls) ball.update();
    for (const fp of this.foodPlatforms) fp.update();
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
