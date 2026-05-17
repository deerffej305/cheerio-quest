import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import { cheatManager } from '../systems/CheatManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import BadBacterium from '../entities/enemies/BadBacterium.js';
import GoodBacterium from '../entities/GoodBacterium.js';
import WaterReabsorbingPlatform from '../entities/WaterReabsorbingPlatform.js';
import MethanePocket from '../entities/MethanePocket.js';
import FiberBrickWall from '../entities/FiberBrickWall.js';
import FiberToken from '../entities/FiberToken.js';
import { sound } from '../systems/SoundManager.js';

// Room 5 — Large Intestine per GAME_DESIGN.md §6.5. Default
// platforming returns; twisting fold-corridor terrain. Bad
// bacteria patrol, good bacteria float as +5 collectibles, water-
// reabsorbing tiles shrink underfoot, methane pockets bounce you
// upward, and one fiber-brick wall guards the fiber token (only
// Big Cheerio can break through).

const ROOM_WIDTH = 3800;
const FLOOR_Y = 620;
const SPAWN_X = 100;
const SPAWN_Y = 460;
const EXIT_X = ROOM_WIDTH - 100;

export default class RoomLargeIntestine extends Phaser.Scene {
  constructor() {
    super('RoomLargeIntestine');
  }

  create() {
    this.phase = 'play';
    this.cameras.main.setBackgroundColor('#5a3010');
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, GAME_HEIGHT);

    this.inputs = new InputManager(this);
    this.platforms = this.physics.add.staticGroup();
    this.waterPlatforms = [];

    this.buildTerrain();
    this.spawnCheerio();
    this.spawnEnemies();
    this.spawnGoodBacteria();
    this.spawnMethane();
    this.spawnFiberWallAndToken();
    this.spawnExit();

    this.bindEsc();
    this.scene.get('Hud')?.setRoomLabel('Room 5 — Large Intestine');
  }

  // --- Terrain ----------------------------------------------------

  buildTerrain() {
    // Background — painted large-intestine corridor.
    this.add.image(ROOM_WIDTH / 2, GAME_HEIGHT / 2, 'room-large-intestine-bg').setDepth(-10);

    // Floor across the room — invisible hitbox.
    const ground = this.add.rectangle(ROOM_WIDTH / 2, FLOOR_Y + 40, ROOM_WIDTH, 80, 0x884028).setVisible(false);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Roof — invisible hitbox.
    const roof = this.add.rectangle(ROOM_WIDTH / 2, 20, ROOM_WIDTH, 40, 0x6a2418).setVisible(false);
    this.physics.add.existing(roof, true);
    this.platforms.add(roof);

    // Fold-corridor platforms — labyrinth-ish. Two-tier layout.
    const ledgeSpecs = [
      { x: 320,  y: 460, w: 160 },
      { x: 540,  y: 360, w: 180 },
      { x: 800,  y: 460, w: 160 },
      { x: 1040, y: 360, w: 140 },
      { x: 1340, y: 460, w: 160 },
      { x: 1600, y: 320, w: 180 },
      { x: 1900, y: 440, w: 140 },
      { x: 2180, y: 360, w: 160 },
      { x: 2500, y: 460, w: 180 },
      { x: 2820, y: 360, w: 160 },
      { x: 3140, y: 440, w: 160 },
      { x: 3420, y: 360, w: 180 },
    ];
    for (const { x, y, w } of ledgeSpecs) {
      const p = this.add.rectangle(x, y, w, 18, 0xa05428);
      this.physics.add.existing(p, true);
      this.platforms.add(p);
    }

    // Water-reabsorbing platforms — shrink underfoot. Lighter brown
    // so the player can read them as "different" from solid ledges.
    const waterSpecs = [
      { x: 1180, y: 500, w: 120 },
      { x: 2040, y: 500, w: 120 },
      { x: 2960, y: 500, w: 120 },
    ];
    for (const { x, y, w } of waterSpecs) {
      const wp = new WaterReabsorbingPlatform(this, x, y, w, 18);
      this.waterPlatforms.push(wp);
    }

    // Atmospheric labels.
    this.add.text(160, 80, 'Large Intestine — watch the shrinking pads + bouncy methane!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffd0a8',
    });
  }

  // --- Cheerio ----------------------------------------------------

  spawnCheerio() {
    this.cheerio = new Cheerio(this, SPAWN_X, SPAWN_Y);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);
    for (const wp of this.waterPlatforms) {
      this.physics.add.collider(this.cheerio.sprite, wp.sprite, () => {
        if (this.cheerio.body.touching.down && wp.sprite.body.touching.up) {
          wp.noteCheerioStanding();
        }
      });
    }
    this.cameras.main.startFollow(this.cheerio.sprite, true, 0.12, 0.12);
  }

  // --- Enemies + Collectibles ------------------------------------

  spawnEnemies() {
    this.bacteria = [];
    const specs = [
      { x: 540,  y: 340, range: [460, 620] },
      { x: 1040, y: 340, range: [970, 1110] },
      { x: 1600, y: 300, range: [1520, 1680] },
      { x: 2180, y: 340, range: [2100, 2260] },
      { x: 2820, y: 340, range: [2740, 2900] },
      { x: 3420, y: 340, range: [3340, 3500] },
    ];
    for (const { x, y, range } of specs) {
      const b = new BadBacterium(this, x, y, { rangeLeft: range[0], rangeRight: range[1] });
      this.physics.add.collider(b.sprite, this.platforms);
      this.physics.add.collider(this.cheerio.sprite, b.sprite, () => this.handleBadBacteriumContact(b));
      this.bacteria.push(b);
    }
  }

  spawnGoodBacteria() {
    this.goodBacteria = [];
    const specs = [
      { x: 320,  y: 400 },
      { x: 680,  y: 280 },
      { x: 1180, y: 380 },
      { x: 1480, y: 280 },
      { x: 1860, y: 380 },
      { x: 2280, y: 280 },
      { x: 2680, y: 380 },
      { x: 3220, y: 360 },
    ];
    for (const { x, y } of specs) {
      const g = new GoodBacterium(this, x, y);
      this.physics.add.overlap(this.cheerio.sprite, g.sprite, () => this.handleGoodBacteriumPickup(g));
      this.goodBacteria.push(g);
    }
  }

  spawnMethane() {
    this.methanePockets = [];
    const specs = [
      { x: 920,  y: 560, w: 90 },
      { x: 1700, y: 560, w: 90 },
      { x: 2620, y: 560, w: 90 },
    ];
    for (const { x, y, w } of specs) {
      const m = new MethanePocket(this, x, y, w);
      this.physics.add.collider(this.cheerio.sprite, m.sprite, () => {
        if (this.cheerio.body.touching.down && m.sprite.body.touching.up) {
          m.bounce(this.cheerio);
        }
      });
      this.methanePockets.push(m);
    }
  }

  spawnFiberWallAndToken() {
    // A fiber-brick wall guards the fiber token. Only Big Cheerio
    // can smash through it — Small bounces off.
    this.fiberWall = new FiberBrickWall(this, ROOM_WIDTH - 380, FLOOR_Y - 40, 24, 80);
    this.physics.add.collider(
      this.cheerio.sprite,
      this.fiberWall.sprite,
      null,
      () => this.fiberWall.alive && this.cheerio.state === 'small',
    );
    this.physics.add.overlap(this.cheerio.sprite, this.fiberWall.sprite, () => {
      if (this.fiberWall.alive && this.cheerio.state === 'big') {
        this.fiberWall.breakOpen();
        this.hud()?.flash('WALL BROKEN!');
      }
    });

    this.fiberToken = new FiberToken(this, ROOM_WIDTH - 320, FLOOR_Y - 60);
    this.physics.add.overlap(this.cheerio.sprite, this.fiberToken.sprite, () => this.handleFiberPickup());
  }

  // --- Exit -------------------------------------------------------

  spawnExit() {
    this.exitDoor = this.add.image(EXIT_X, FLOOR_Y - 60, 'exit-sigmoid');
    this.exitDoor.setDisplaySize(180, 360);
    this.add.text(EXIT_X, FLOOR_Y - 140, 'SIGMOID →\n(to rectum)', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#a0ffa0', align: 'center',
    }).setOrigin(0.5);
    this.physics.add.existing(this.exitDoor);
    this.exitDoor.body.setAllowGravity(false);
    this.exitDoor.body.setImmovable(true);
    this.physics.add.overlap(this.cheerio.sprite, this.exitDoor, () => this.completeRoom());
  }

  // --- Contact handlers ------------------------------------------

  handleBadBacteriumContact(b) {
    if (!b.alive || !this.cheerio.alive) return;
    const stomped = this.cheerio.body.touching.down && b.sprite.body.touching.up;
    if (stomped) {
      b.squash();
      scoreManager.addPoints(10);
      this.cheerio.body.setVelocityY(-400);
      sound.play('stomp');
      this.hud()?.flash('+10');
    } else {
      this.applyHitToCheerio();
    }
  }

  handleGoodBacteriumPickup(g) {
    if (g.collected || !this.cheerio.alive) return;
    g.collect();
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
      this.handleDeath();
    }
  }

  handleDeath() {
    if (cheatManager.invincible) return; // /titlecard
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
    sound.play('room-clear');
    this.hud()?.flash('ROOM CLEARED — quiz time!', 1500);
    this.time.delayedCall(1600, () => {
      this.scene.start('Quiz', {
        room: 'large_intestine', nextScene: 'RoomAnus',
        cutsceneKey: 'poop',
      });
    });
  }

  // --- Frame loop -------------------------------------------------

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);
    if (this.phase !== 'play') return;
    for (const b of this.bacteria) b.update();
    for (const wp of this.waterPlatforms) wp.update();
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
