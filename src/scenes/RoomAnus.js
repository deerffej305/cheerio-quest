import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import Cheerio from '../entities/Cheerio.js';
import InputManager from '../systems/InputManager.js';
import PoopBoss from '../entities/enemies/PoopBoss.js';
import { sound } from '../systems/SoundManager.js';

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
    this.spawnExitTile();
    this.spawnPoopBoss();
    this.spawnHud();
    this.startFartCycle();

    this.bindEsc();
    this.scene.get('Hud')?.setRoomLabel('Room 6 — Anus (final!)');
  }

  // --- Maze geometry ---------------------------------------------

  buildMaze() {
    // Background — painted maze chamber.
    this.add.image(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 'room-anus-bg').setDepth(-10);

    // Floor — invisible hitbox.
    const ground = this.add.rectangle(ROOM_WIDTH / 2, FLOOR_Y + 40, ROOM_WIDTH, 80, 0x5a2a14).setVisible(false);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Ceiling — invisible hitbox.
    const roof = this.add.rectangle(ROOM_WIDTH / 2, 20, ROOM_WIDTH, 40, 0x3a1a08).setVisible(false);
    this.physics.add.existing(roof, true);
    this.platforms.add(roof);

    // Side walls — invisible hitboxes.
    const leftWall = this.add.rectangle(20, ROOM_HEIGHT / 2, 40, ROOM_HEIGHT, 0x3a1a08).setVisible(false);
    this.physics.add.existing(leftWall, true);
    this.platforms.add(leftWall);
    const rightWall = this.add.rectangle(ROOM_WIDTH - 20, ROOM_HEIGHT / 2, 40, ROOM_HEIGHT, 0x3a1a08).setVisible(false);
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

  // --- Poop Boss (sits on the exit tile) -------------------------

  spawnPoopBoss() {
    // Boss is parked on the exit perch. Stomping him three times
    // makes him grudgingly roll off; he doesn't die. After he
    // relocates, Crispy can stand on the now-unblocked exit tile
    // and wait for the next fart.
    const ledgeTopY = this.exitTileY + 6; // perch ledge surface
    this.poopBoss = new PoopBoss(this, this.exitTileX, ledgeTopY - 40);
    this.physics.add.collider(this.poopBoss.sprite, this.platforms);
    this.physics.add.collider(this.cheerio.sprite, this.poopBoss.sprite, () => this.handlePoopBossContact());
  }

  handlePoopBossContact() {
    if (!this.poopBoss || this.poopBoss.isRelocated() || !this.cheerio.alive) return;
    const stomped = this.cheerio.body.touching.down && this.poopBoss.sprite.body.touching.up;
    if (stomped) {
      const relocated = this.poopBoss.takeStomp();
      this.cheerio.body.setVelocityY(-440);
      sound.play('stomp');
      this.hud()?.flash(relocated ? 'BOSS ROLLED OFF!' : 'Stomp him again!');
    }
    // No damage on side contact — he's lazy, not aggressive.
  }

  // --- Exit tile (the one safe spot during a fart) ---------------

  spawnExitTile() {
    // Exit tile sits on top of the upper-right exit perch (the
    // highest platform in the room). Visually a glowing green pad
    // hovering just above the perch's surface.
    this.exitTileX = 1130;
    this.exitTileY = 131;       // top of perch is y = 140 - 9 = 131
    this.exitTile = this.add.image(this.exitTileX, this.exitTileY - 6, 'exit-tile');
    this.exitTile.setDisplaySize(240, 24);

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
    // STORY.md panel 5 of the Poop Boss cutscene shows a "FART IN
    // 30 SECONDS" countdown — that 30s window is the player's
    // designed time to stomp the boss off the tile and position
    // for the launch. Subsequent farts use the fiber-modulated
    // standard period.
    const FIRST_FART_MS = 30000;
    this.nextFartAt = this.time.now + FIRST_FART_MS;
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

    sound.play('fart');
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
    sound.play('room-clear');
    // Launch the cheerio up and to the right in a triumphant arc.
    this.tweens.add({
      targets: this.cheerio.sprite,
      x: ROOM_WIDTH - 40,
      y: 80,
      angle: 540,
      duration: 1100,
      ease: 'Cubic.Out',
    });
    this.hud()?.flash('LAUNCHED INTO THE TOILET!', 2200);
    // After the launch animation, play the Splashdown cutscene,
    // then show the credits / score recap.
    this.time.delayedCall(1200, () => this.playSplashdownAndCredits());
  }

  playSplashdownAndCredits() {
    // The Splashdown cutscene IS the ending per STORY.md — its
    // panel 6 shows the live score recap, and on its final advance
    // it prompts for the player's name and submits to the
    // leaderboard. No separate post-cutscene credits screen.
    this.scene.stop('Hud');
    this.scene.start('Cutscene', {
      key: 'splashdown',
      nextScene: 'Title',
      submitOnAdvance: true,
    });
  }

  // Kept as a fallback if the cutscene path ever fails — also
  // reachable from the Anus quit-to-title flow in pause.
  showCredits() {
    // Final freeze-frame in the toilet bowl + score recap.
    const cx = GAME_WIDTH / 2;
    const dim = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setScrollFactor(0);
    this.add.text(cx, 140, 'YOU MADE IT!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '54px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(cx, 220, 'Crispy made it through!', {
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
    // No leaderboard submission here — the splashdown cutscene
    // owns that flow now. This branch is only reachable as a
    // fallback.
  }

  // --- Frame loop -------------------------------------------------

  update(_time, delta) {
    if (this.cheerio) this.cheerio.update(delta);
    if (this.phase !== 'play') return;

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
    const openPause = () => {
      this.scene.pause();
      this.scene.launch('Pause', { pausedSceneKey: this.scene.key });
    };
    this.input.keyboard.on('keydown-ESC', openPause);
    this.input.keyboard.on('keydown-P', openPause);
  }
}
