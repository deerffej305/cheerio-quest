import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { scoreManager } from '../systems/ScoreManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import CavityBacterium from '../entities/enemies/CavityBacterium.js';
import ChompingTeeth from '../entities/hazards/ChompingTeeth.js';
import SalivaBlob from '../entities/hazards/SalivaBlob.js';
import TongueBoss from '../entities/enemies/TongueBoss.js';
import FiberToken from '../entities/FiberToken.js';

const ROOM_WIDTH = 2400;
const FLOOR_Y = 640;
const CEILING_Y = 100;
const SPAWN_X = 80;
const EXIT_X = 2300;

export default class RoomMouth extends Phaser.Scene {
  constructor() {
    super('RoomMouth');
  }

  create() {
    this.phase = 'intro';
    this.cameras.main.setBackgroundColor('#3a1024');
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, GAME_HEIGHT);

    this.inputs = new InputManager(this);
    this.platforms = this.physics.add.staticGroup();

    this.buildStaticGeometry();
    this.spawnCheerio();
    this.spawnSpoonAndIntro();
    this.spawnEnemies();
    this.spawnTongueBoss();
    this.spawnSaliva();
    this.spawnFiberToken();
    this.spawnExit();

    this.bindEsc();
  }

  // --- Geometry ---------------------------------------------------

  buildStaticGeometry() {
    // Mouth floor spans the room. The spoon visual lifts in from
    // below the screen — it doesn't need a gap in the floor.
    const ground = this.add.rectangle(
      ROOM_WIDTH / 2,
      FLOOR_Y + 40,
      ROOM_WIDTH,
      80,
      0xff90a8,
    );
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Roof of the mouth.
    const roof = this.add.rectangle(ROOM_WIDTH / 2, CEILING_Y - 20, ROOM_WIDTH, 40, 0x8a2a48);
    this.physics.add.existing(roof, true);
    this.platforms.add(roof);

    // Right wall — back of the mouth before the exit.
    const backWall = this.add.rectangle(ROOM_WIDTH - 20, GAME_HEIGHT / 2, 40, GAME_HEIGHT, 0x5a1430);
    this.physics.add.existing(backWall, true);
    this.platforms.add(backWall);

    // Decorative taste-bud platforms — cosmetic colors but real
    // collision so the player can hop across them.
    const tasteBuds = [
      { x: 480, y: FLOOR_Y - 130, color: 0xff7090 }, // sweet
      { x: 700, y: FLOOR_Y - 200, color: 0xffe070 }, // sour
      { x: 920, y: FLOOR_Y - 160, color: 0x70d0ff }, // salty
      { x: 1140, y: FLOOR_Y - 230, color: 0x90a070 }, // bitter
    ];
    tasteBuds.forEach(({ x, y, color }) => {
      const pad = this.add.rectangle(x, y, 140, 18, color);
      this.physics.add.existing(pad, true);
      this.platforms.add(pad);
    });

    // Back molars — high platforms near the right side. The fiber
    // token sits on the rear molar.
    this.molarRear = this.add.rectangle(1830, FLOOR_Y - 250, 160, 28, 0xf5e7c0);
    this.physics.add.existing(this.molarRear, true);
    this.platforms.add(this.molarRear);

    const molarFront = this.add.rectangle(1620, FLOOR_Y - 160, 140, 26, 0xf5e7c0);
    this.physics.add.existing(molarFront, true);
    this.platforms.add(molarFront);

    // Atmospheric labels — quick orientation aids for grey-box.
    this.add.text(420, CEILING_Y + 20, '↓ chomping teeth row ↓', { fontFamily: 'system-ui', fontSize: '14px', color: '#ffffff' });
    this.add.text(1700, CEILING_Y + 20, 'molars + fiber token', { fontFamily: 'system-ui', fontSize: '14px', color: '#ffffff' });
    this.add.text(2080, CEILING_Y + 20, '← back of mouth', { fontFamily: 'system-ui', fontSize: '14px', color: '#ffffff' });
  }

  // --- Cheerio + spoon intro -------------------------------------

  spawnCheerio() {
    this.cheerio = new Cheerio(this, SPAWN_X, FLOOR_Y - 120);
    this.cheerio.freezeControl(true);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);
    this.cameras.main.startFollow(this.cheerio.sprite, true, 0.12, 0.12);
  }

  spawnSpoonAndIntro() {
    // The spoon: a gray rectangle that rises from below into the
    // mouth, carrying the cheerio up to the entry floor. Once it
    // lands, control unlocks. No physics collider needed — we tween
    // both positions manually.
    const spoonStartY = GAME_HEIGHT + 60;
    const spoonEndY = FLOOR_Y - 4;
    this.spoon = this.add.rectangle(SPAWN_X, spoonStartY, 110, 24, 0xb0b8c0);

    this.cheerio.setPosition(SPAWN_X, spoonStartY - 36);
    this.cheerio.body.setAllowGravity(false);

    const introText = this.add.text(SPAWN_X, FLOOR_Y - 250, 'Spoon delivery…', {
      fontFamily: 'system-ui', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.spoon,
      y: spoonEndY,
      duration: 1400,
      ease: 'Cubic.Out',
      onUpdate: () => {
        this.cheerio.sprite.y = this.spoon.y - 36;
      },
      onComplete: () => {
        introText.setText('Run! Right →, Jump (Space). Stomp the tongue!');
        this.tweens.add({
          targets: introText,
          alpha: 0,
          delay: 2200,
          duration: 600,
          onComplete: () => introText.destroy(),
        });
        this.cheerio.body.setAllowGravity(true);
        this.cheerio.freezeControl(false);
        this.phase = 'play';
        this.tweens.add({
          targets: this.spoon,
          y: GAME_HEIGHT + 60,
          alpha: 0,
          delay: 200,
          duration: 600,
          onComplete: () => this.spoon.destroy(),
        });
      },
    });
  }

  // --- Enemies ----------------------------------------------------

  spawnEnemies() {
    this.bacteria = [];
    const positions = [
      { x: 820, range: [720, 960] },
      { x: 1140, range: [1040, 1260] },
      { x: 1500, range: [1380, 1580] },
    ];
    for (const { x, range } of positions) {
      const b = new CavityBacterium(this, x, FLOOR_Y - 12, {
        rangeLeft: range[0],
        rangeRight: range[1],
      });
      this.physics.add.collider(b.sprite, this.platforms);
      this.physics.add.collider(this.cheerio.sprite, b.sprite, () => this.handleBacteriumContact(b));
      this.bacteria.push(b);
    }

    // Row of chomping teeth across the front of the mouth. The tongue
    // lunges from the back-right and pushes the player toward this
    // row — catching a chomp is the damage source. Phases are
    // staggered so the player gets timing windows to dash through.
    const teethPositions = [
      { x: 260, offset: 0 },
      { x: 380, offset: 900 },
      { x: 500, offset: 1800 },
      { x: 620, offset: 2700 },
    ];
    this.teethRow = teethPositions.map(({ x, offset }) =>
      new ChompingTeeth(this, x, FLOOR_Y, CEILING_Y + 40, { width: 70, phaseOffset: offset })
    );
  }

  spawnTongueBoss() {
    // Big, thick tongue. Sweeps from the back-right almost all the
    // way to the teeth row so a caught player gets shoved into it.
    this.tongue = new TongueBoss(this, ROOM_WIDTH - 80, FLOOR_Y, {
      reachX: 700,
      height: 56,
    });
    this.physics.add.overlap(this.cheerio.sprite, this.tongue.tongue, () => this.handleTongueContact());
  }

  spawnSaliva() {
    // Saliva blobs sit on the floor in the approach to the tongue.
    // Contact dissolves the Cheerio — instant-restart, lava rule.
    // Positioned in the gap between the cavity bacteria and the
    // tongue base, so the player has to thread between them while
    // dodging the tongue's lunge.
    const positions = [
      { x: 1700, w: 70 },
      { x: 1980, w: 70 },
      { x: 2120, w: 80 },
    ];
    this.saliva = positions.map(({ x, w }) => {
      const blob = new SalivaBlob(this, x, FLOOR_Y - 11, { width: w, height: 22 });
      this.physics.add.overlap(this.cheerio.sprite, blob.sprite, () => this.handleSalivaContact());
      return blob;
    });
  }

  spawnFiberToken() {
    this.fiberToken = new FiberToken(this, this.molarRear.x, this.molarRear.y - 26);
    this.physics.add.overlap(this.cheerio.sprite, this.fiberToken.sprite, () => this.handleFiberPickup());
  }

  // --- Exit door --------------------------------------------------

  spawnExit() {
    this.exitDoor = this.add.rectangle(EXIT_X, FLOOR_Y - 60, 60, 120, 0x202020);
    this.exitLockText = this.add.text(EXIT_X, FLOOR_Y - 140, 'LOCKED\n(beat tongue)', {
      fontFamily: 'system-ui', fontSize: '14px', color: '#ff8080', align: 'center',
    }).setOrigin(0.5);
  }

  unlockExit() {
    this.exitDoor.fillColor = 0x80ffa0;
    this.exitLockText.setText('EXIT →\nswallow');
    this.exitLockText.setColor('#a0ffa0');
  }

  // --- Contact handlers ------------------------------------------

  handleBacteriumContact(bacterium) {
    if (!bacterium.alive || !this.cheerio.alive) return;
    // Stomp = cheerio's underside pressed against bacterium's top.
    // Phaser's collider sets touching.down/up on the bodies the frame
    // a contact is registered; this is the canonical platformer check.
    const stomped = this.cheerio.body.touching.down && bacterium.sprite.body.touching.up;
    if (stomped) {
      bacterium.squash();
      scoreManager.addPoints(10);
      this.cheerio.body.setVelocityY(-400);
      this.hud()?.flash('+10');
    } else {
      this.applyHitToCheerio();
    }
  }

  handleTongueContact() {
    if (!this.cheerio.alive) return;
    const verdict = this.tongue.resolveContact(this.cheerio);
    if (verdict === 'stomp') {
      this.tongue.takeStomp();
      this.cheerio.body.setVelocityY(-520);
      scoreManager.addPoints(15);
      this.hud()?.flash(this.tongue.isDead() ? 'TONGUE DOWN!' : '+15');
      if (this.tongue.isDead()) {
        this.unlockExit();
      }
    } else if (verdict === 'push') {
      // Shove the cheerio left toward the chomping teeth — that's
      // where the actual damage will come from per the design doc.
      this.cheerio.body.setVelocityX(-360);
      if (this.cheerio.body.blocked.down) {
        this.cheerio.body.setVelocityY(-180);
      }
    }
  }

  handleFiberPickup() {
    if (this.fiberToken.collected || !this.cheerio.alive) return;
    this.fiberToken.collect();
    scoreManager.addFiber();
    if (this.cheerio.state === 'small') {
      this.cheerio.grow();
      this.hud()?.setSize('big');
      this.hud()?.flash('GROWING!');
    } else {
      scoreManager.addPoints(10);
      this.hud()?.flash('Fiber +10');
    }
  }

  handleSalivaContact() {
    if (!this.cheerio.alive || this.phase === 'dying') return;
    // Saliva dissolves the Cheerio — instant restart regardless of
    // size, same rule as acid pits. The shrunk-state grace period
    // doesn't apply here.
    this.hud()?.flash('DISSOLVED!', 1200);
    this.cheerio.die();
    this.handleDeath();
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
    this.time.delayedCall(1100, () => {
      this.scene.restart();
    });
  }

  // --- Frame loop -------------------------------------------------

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);
    if (this.phase === 'intro') return;

    for (const t of this.teethRow) {
      t.update();
      if (t.isClosed() && t.containsPlayer(this.cheerio)) {
        this.applyHitToCheerio();
        break;
      }
    }

    for (const b of this.bacteria) b.update();
    this.tongue.update(this.cheerio);

    // Exit reached?
    if (
      this.phase === 'play'
      && this.tongue.isDead()
      && this.cheerio.x >= EXIT_X - 20
    ) {
      this.completeRoom();
    }
  }

  completeRoom() {
    this.phase = 'won';
    this.cheerio.freezeControl(true);
    this.hud()?.flash('ROOM CLEARED — Esophagus next (placeholder)', 2400);
    this.time.delayedCall(2300, () => {
      this.scene.stop('Hud');
      this.scene.start('Title');
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
