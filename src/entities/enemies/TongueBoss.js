import Phaser from 'phaser';

// Tongue boss — anchored at the back-right of the room. The base
// (right anchor) never moves; the 'tip' extends leftward across the
// floor during a lunge. Player must jump onto the lunging tongue to
// stomp it; standing on top during retract is fine. Side contact
// (stepping into the front of an extended tongue) pushes the player
// left toward the chomping teeth.
//
// HP = 4. On death, the tongue slouches flat — becomes a walkable
// static ramp the player runs over to reach the exit.

const STATES = {
  IDLE: 'idle',
  TELEGRAPH: 'telegraph',
  LUNGING: 'lunging',
  HOLD: 'hold',
  RETRACTING: 'retracting',
  RECOIL: 'recoil',     // post-stomp pull-back
  SLOUCHED: 'slouched', // dead
};

const DURATIONS = {
  idle: 1700,
  telegraph: 700,
  lunging: 500,
  hold: 350,
  retracting: 900,
  recoil: 600,
};

export default class TongueBoss {
  constructor(scene, anchorX, floorY, { reachX, height = 28, maxHp = 4 } = {}) {
    this.scene = scene;
    this.anchorX = anchorX;
    this.floorY = floorY;
    this.tipMinX = reachX ?? anchorX - 460;
    this.height = height;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.state = STATES.IDLE;
    this.stateStartedAt = scene.time.now;

    // The base — a small bump at the anchor that stays put.
    this.base = scene.add.rectangle(anchorX - 18, floorY - 18, 60, 36, 0xa05060);

    // The tongue body. Width animates between 0 and (anchorX - tipMinX).
    // Origin pinned to the right edge so growing width extends leftward.
    this.tongue = scene.add.rectangle(anchorX, floorY - 6, 0, height, 0xcc5070);
    this.tongue.setOrigin(1, 1);
    scene.physics.add.existing(this.tongue);
    this.tongue.body.setAllowGravity(false);
    this.tongue.body.setImmovable(true);
    this.tongue.tongueBoss = this;
    this.syncBodyToWidth();

    this.hpText = scene.add.text(anchorX - 30, floorY - 80, this.hpLabel(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  hpLabel() {
    const hp = Math.max(0, this.hp);
    return `TONGUE ${'♥'.repeat(hp)}${'·'.repeat(this.maxHp - hp)}`;
  }

  topY() {
    // Top of the tongue collider in world coords.
    return this.tongue.y - this.tongue.height;
  }

  frontX() {
    // Leftmost x of the tongue (its 'tip' during a lunge).
    return this.tongue.x - this.tongue.width;
  }

  isExtended() {
    return this.tongue.width > 6;
  }

  isDangerous() {
    // Only active states inflict push; recoil/retract/slouched safe.
    return this.state === STATES.LUNGING || this.state === STATES.HOLD;
  }

  syncBodyToWidth() {
    const w = Math.max(1, this.tongue.width);
    const h = this.tongue.height;
    this.tongue.body.setSize(w, h);
    // Origin (1, 1) means the body offset must keep the right edge pinned.
    this.tongue.body.setOffset(this.tongue.displayWidth - w, this.tongue.displayHeight - h);
  }

  setExtent(extent) {
    // extent in [0, 1]
    const maxW = this.anchorX - this.tipMinX;
    this.tongue.width = Phaser.Math.Clamp(extent, 0, 1) * maxW;
    this.tongue.displayWidth = this.tongue.width;
    this.syncBodyToWidth();
  }

  advance(to) {
    this.state = to;
    this.stateStartedAt = this.scene.time.now;
  }

  update(cheerio) {
    if (this.state === STATES.SLOUCHED) return;
    const now = this.scene.time.now;
    const elapsed = now - this.stateStartedAt;

    switch (this.state) {
      case STATES.IDLE: {
        this.setExtent(0);
        this.tongue.fillColor = 0xcc5070;
        if (elapsed >= DURATIONS.idle) this.advance(STATES.TELEGRAPH);
        break;
      }
      case STATES.TELEGRAPH: {
        this.tongue.fillColor = 0xff8090;
        this.setExtent(0.08 + 0.03 * Math.sin(now / 50));
        if (elapsed >= DURATIONS.telegraph) this.advance(STATES.LUNGING);
        break;
      }
      case STATES.LUNGING: {
        this.tongue.fillColor = 0xff5070;
        const t = Phaser.Math.Easing.Quadratic.Out(elapsed / DURATIONS.lunging);
        this.setExtent(t);
        if (elapsed >= DURATIONS.lunging) this.advance(STATES.HOLD);
        break;
      }
      case STATES.HOLD: {
        this.setExtent(1);
        if (elapsed >= DURATIONS.hold) this.advance(STATES.RETRACTING);
        break;
      }
      case STATES.RETRACTING: {
        this.tongue.fillColor = 0xcc5070;
        const t = elapsed / DURATIONS.retracting;
        this.setExtent(1 - Phaser.Math.Easing.Quadratic.In(t));
        if (elapsed >= DURATIONS.retracting) this.advance(STATES.IDLE);
        break;
      }
      case STATES.RECOIL: {
        this.tongue.fillColor = 0x903040;
        const t = elapsed / DURATIONS.recoil;
        this.setExtent(1 - Phaser.Math.Easing.Cubic.Out(t));
        if (elapsed >= DURATIONS.recoil) this.advance(STATES.IDLE);
        break;
      }
      default:
        break;
    }
  }

  // Called from RoomMouth's overlap handler when the cheerio's box
  // intersects the tongue. Returns: 'stomp' | 'push' | 'safe'.
  resolveContact(cheerio) {
    if (this.state === STATES.SLOUCHED) return 'safe';
    if (!this.isExtended()) return 'safe';

    const cheerioOnTop = cheerio.isStomping(this.topY());
    if (cheerioOnTop) return 'stomp';

    if (this.isDangerous()) return 'push';
    return 'safe';
  }

  takeStomp() {
    if (this.state === STATES.SLOUCHED || this.state === STATES.RECOIL) return;
    this.hp -= 1;
    this.hpText.setText(this.hpLabel());
    if (this.hp <= 0) {
      this.slouch();
    } else {
      this.advance(STATES.RECOIL);
    }
  }

  slouch() {
    this.state = STATES.SLOUCHED;
    this.tongue.fillColor = 0x884050;
    this.setExtent(1);
    this.tongue.body.setImmovable(true);
    this.hpText.setText('TONGUE DOWN');
    this.hpText.setColor('#90ff90');
  }

  isDead() {
    return this.state === STATES.SLOUCHED;
  }
}
