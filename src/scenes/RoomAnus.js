import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import PoopBoss from '../entities/enemies/PoopBoss.js';
import CavityBacterium from '../entities/enemies/CavityBacterium.js';
import { sound } from '../systems/SoundManager.js';

// Room 6 — Rectum (Anus). Reworked per CJ: horizontal level.
// Crispy travels right along a flat floor. Periodic fart events
// roll through — telegraphed by 1.2s of screen shake. The player
// has to be near a hideout (rock / dropping) when the fart fires,
// or it stinks them to death. At the end: the lazy Poop Boss
// blocks the exit; one stomp and he rolls off, revealing the
// pylorus to the toilet (splashdown cutscene).

const ROOM_WIDTH = 4800;
const ROOM_HEIGHT = 720;
const FLOOR_Y = 620;
const SPAWN_X = 100;
const SPAWN_Y = 540;
const EXIT_X = ROOM_WIDTH - 180;

// Fart timings.
const FART_IDLE_MIN_MS = 4500;
const FART_IDLE_MAX_MS = 7000;
const FART_TELEGRAPH_MS = 1400;
const FART_ACTIVE_MS = 600;
const HIDEOUT_SAFE_RADIUS = 130;

// Phases: idle (waiting) → telegraph (shaking) → active (kill check) → idle.
const FART_PHASE = {
  IDLE: 'idle',
  TELEGRAPH: 'telegraph',
  ACTIVE: 'active',
};

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
    this.hideouts = [];

    this.buildWorld();
    this.spawnHideouts();
    this.spawnCheerio();
    this.spawnMiniPoops();
    this.spawnPoopBoss();
    this.spawnExit();
    this.spawnHud();
    this.startFartCycle();

    this.bindEsc();
    this.scene.get('Hud')?.setRoomLabel('Room 6 — Rectum (final!)');
  }

  // --- World geometry --------------------------------------------

  buildWorld() {
    // Painted maze chamber — stretched across the longer room width.
    const bg = this.add.image(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 'room-anus-bg');
    bg.setDisplaySize(ROOM_WIDTH, ROOM_HEIGHT);
    bg.setDepth(-10);

    // Floor — invisible hitbox.
    const ground = this.add.rectangle(ROOM_WIDTH / 2, FLOOR_Y + 40, ROOM_WIDTH, 80, 0x5a2a14).setVisible(false);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Side walls — invisible hitboxes (no ceiling needed; Crispy
    // never jumps above the play area on a flat track).
    const leftWall = this.add.rectangle(20, ROOM_HEIGHT / 2, 40, ROOM_HEIGHT, 0x3a1a08).setVisible(false);
    this.physics.add.existing(leftWall, true);
    this.platforms.add(leftWall);
    const rightWall = this.add.rectangle(ROOM_WIDTH - 20, ROOM_HEIGHT / 2, 40, ROOM_HEIGHT, 0x3a1a08).setVisible(false);
    this.physics.add.existing(rightWall, true);
    this.platforms.add(rightWall);
  }

  // --- Hideouts --------------------------------------------------

  // Spread chunky brown blocks along the floor. Each is a hideout —
  // standing within HIDEOUT_SAFE_RADIUS of one during the active
  // fart phase keeps Crispy alive.
  spawnHideouts() {
    const specs = [
      { x: 600,  w: 110, h: 170 },
      { x: 1250, w: 130, h: 200 },
      { x: 1950, w: 110, h: 160 },
      { x: 2700, w: 140, h: 210 },
      { x: 3400, w: 110, h: 180 },
      { x: 4000, w: 130, h: 200 },
    ];
    for (const { x, w, h } of specs) {
      // Visible rock-like brown block sitting on the floor.
      const rock = this.add.rectangle(x, FLOOR_Y - h / 2, w, h, 0x6a3010);
      rock.setStrokeStyle(3, 0x3a1808);
      this.physics.add.existing(rock, true);
      this.platforms.add(rock);
      this.hideouts.push({ x, w, sprite: rock });
    }
  }

  // --- Mini poops (patrolling stompable enemies) -----------------

  spawnMiniPoops() {
    this.miniPoops = [];
    const specs = [
      { x: 950,  rangeLeft: 800,  rangeRight: 1100, speed: 80 },
      { x: 1650, rangeLeft: 1500, rangeRight: 1850, speed: 90 },
      { x: 2350, rangeLeft: 2200, rangeRight: 2550, speed: 75 },
      { x: 3100, rangeLeft: 2900, rangeRight: 3250, speed: 95 },
    ];
    for (const s of specs) {
      const mp = new CavityBacterium(this, s.x, FLOOR_Y - 45, {
        rangeLeft: s.rangeLeft,
        rangeRight: s.rangeRight,
        speed: s.speed,
        textureKey: 'poop-boss',
        displayWidth: 84,
        displayHeight: 70,
        bodyWidth: 72,
        bodyHeight: 60,
      });
      this.physics.add.collider(mp.sprite, this.platforms);
      this.physics.add.collider(this.cheerio.sprite, mp.sprite, () => this.handleMiniPoopContact(mp));
      this.miniPoops.push(mp);
    }
  }

  handleMiniPoopContact(mp) {
    if (!mp.alive || !this.cheerio.alive) return;
    const stomped = this.cheerio.body.touching.down && mp.sprite.body.touching.up;
    if (stomped) {
      mp.squash();
      scoreManager.addPoints(5);
      this.cheerio.body.setVelocityY(-360);
      sound.play('stomp');
      this.hud()?.flash('+5');
    } else {
      this.applyHitToCheerio();
    }
  }

  applyHitToCheerio() {
    const outcome = this.cheerio.takeHit();
    if (outcome === 'shrunk') {
      this.hud()?.setSize('small');
      this.hud()?.flash('OUCH!');
    } else if (outcome === 'died') {
      this.handleFartDeath();
    }
  }

  // --- Cheerio ----------------------------------------------------

  spawnCheerio() {
    this.cheerio = new Cheerio(this, SPAWN_X, SPAWN_Y);
    this.physics.add.collider(this.cheerio.sprite, this.platforms);
    this.cameras.main.startFollow(this.cheerio.sprite, true, 0.18, 0.18);
  }

  // --- Poop Boss (single stomp blocks the exit) ------------------

  spawnPoopBoss() {
    // Park the boss in front of the exit door. One stomp and he
    // rolls off — exit becomes reachable.
    const bossX = EXIT_X - 180;
    const bossY = FLOOR_Y - 40;
    this.poopBoss = new PoopBoss(this, bossX, bossY, { maxHp: 1 });
    this.physics.add.collider(this.poopBoss.sprite, this.platforms);
    this.physics.add.collider(this.cheerio.sprite, this.poopBoss.sprite, () => this.handlePoopBossContact());
  }

  handlePoopBossContact() {
    if (!this.poopBoss || this.poopBoss.isRelocated() || !this.cheerio.alive) return;
    const stomped = this.cheerio.body.touching.down && this.poopBoss.sprite.body.touching.up;
    if (stomped) {
      this.poopBoss.takeStomp();
      this.cheerio.body.setVelocityY(-440);
      sound.play('stomp');
      this.hud()?.flash('BOSS ROLLED OFF!');
    }
    // Walking into him from the side does nothing — he's a wall.
  }

  // --- Exit -------------------------------------------------------

  spawnExit() {
    // Pylorus-style door at the far right. Touching it after the
    // boss has rolled off triggers the splashdown cutscene.
    this.exitDoor = this.add.image(EXIT_X, FLOOR_Y - 100, 'exit-sigmoid');
    this.exitDoor.setDisplaySize(160, 280);
    this.physics.add.existing(this.exitDoor);
    this.exitDoor.body.setAllowGravity(false);
    this.exitDoor.body.setImmovable(true);
    this.physics.add.overlap(this.cheerio.sprite, this.exitDoor, () => {
      if (this.poopBoss?.isRelocated()) this.launchVictory();
    });

    this.add.text(EXIT_X, FLOOR_Y - 260, 'TO THE TOILET →', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#a0ffa0',
    }).setOrigin(0.5);
  }

  // --- In-room HUD ------------------------------------------------

  spawnHud() {
    this.warningText = this.add.text(GAME_WIDTH / 2, 80, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '34px', color: '#ffd060', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0);
  }

  // --- Fart cycle -------------------------------------------------

  startFartCycle() {
    this.fartPhase = FART_PHASE.IDLE;
    this.fartPhaseEndsAt = this.time.now + Phaser.Math.Between(FART_IDLE_MIN_MS, FART_IDLE_MAX_MS);
  }

  isCheerioHidden() {
    if (!this.cheerio?.alive) return false;
    const cx = this.cheerio.x;
    for (const h of this.hideouts) {
      if (Math.abs(cx - h.x) <= HIDEOUT_SAFE_RADIUS) return true;
    }
    return false;
  }

  advanceFartPhase() {
    const now = this.time.now;
    switch (this.fartPhase) {
      case FART_PHASE.IDLE: {
        this.fartPhase = FART_PHASE.TELEGRAPH;
        this.fartPhaseEndsAt = now + FART_TELEGRAPH_MS;
        this.warningText.setText('FART INCOMING — HIDE!').setColor('#ff8060');
        this.cameras.main.shake(FART_TELEGRAPH_MS, 0.006);
        break;
      }
      case FART_PHASE.TELEGRAPH: {
        this.fartPhase = FART_PHASE.ACTIVE;
        this.fartPhaseEndsAt = now + FART_ACTIVE_MS;
        this.warningText.setText('PFFFFFFFT…').setColor('#c8ff60');
        sound.play('fart');
        this.spawnFartCloud();
        // Death check: if cheerio is not behind a hideout when the
        // fart fires, the stink kills him.
        if (!this.isCheerioHidden()) {
          this.handleFartDeath();
          return;
        }
        break;
      }
      case FART_PHASE.ACTIVE: {
        this.fartPhase = FART_PHASE.IDLE;
        this.fartPhaseEndsAt = now + Phaser.Math.Between(FART_IDLE_MIN_MS, FART_IDLE_MAX_MS);
        this.warningText.setText('');
        break;
      }
      default: break;
    }
  }

  spawnFartCloud() {
    // Screen-wide yellow-green stink overlay during the active phase.
    const cloud = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH + 200, GAME_HEIGHT + 200,
      0xc8ff60, 0.55,
    ).setScrollFactor(0).setDepth(20);
    this.tweens.add({
      targets: cloud,
      alpha: 0,
      duration: FART_ACTIVE_MS,
      ease: 'Cubic.Out',
      onComplete: () => cloud.destroy(),
    });
    // A small drifting puff to add some texture to the wave.
    const puff = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80,
      GAME_WIDTH, 220,
      0xb8e060, 0.7,
    ).setScrollFactor(0).setDepth(21);
    this.tweens.add({
      targets: puff,
      x: GAME_WIDTH / 2 + 300,
      alpha: 0,
      duration: FART_ACTIVE_MS,
      ease: 'Cubic.Out',
      onComplete: () => puff.destroy(),
    });
  }

  handleFartDeath() {
    if (this.phase === 'dying') return;
    this.phase = 'dying';
    scoreManager.payDeathPenalty();
    this.cheerio.die('fade');
    this.hud()?.flash('STINK DEATH — RESTART', 1400);
    this.time.delayedCall(1300, () => this.scene.restart());
  }

  // --- Victory ----------------------------------------------------

  launchVictory() {
    if (this.phase !== 'play') return;
    this.phase = 'won';
    this.cheerio.freezeControl(true);
    this.cheerio.body.setAllowGravity(false);
    sound.play('room-clear');
    this.tweens.add({
      targets: this.cheerio.sprite,
      x: EXIT_X,
      y: 120,
      angle: 540,
      duration: 1100,
      ease: 'Cubic.Out',
    });
    this.hud()?.flash('LAUNCHED INTO THE TOILET!', 2200);
    this.time.delayedCall(1200, () => this.playSplashdownAndCredits());
  }

  playSplashdownAndCredits() {
    this.scene.stop('Hud');
    this.scene.start('Cutscene', {
      key: 'splashdown',
      nextScene: 'Title',
      submitOnAdvance: true,
    });
  }

  // --- Frame loop -------------------------------------------------

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);
    if (this.phase !== 'play') return;

    if (this.time.now >= this.fartPhaseEndsAt) this.advanceFartPhase();
    for (const mp of this.miniPoops) mp.update();
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
