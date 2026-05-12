import Phaser from 'phaser';

// Tongue boss — anchored at the back-right of the mouth. The base
// (right anchor) never moves; the tongue extends from the base's
// left edge.
//
// Lunge cycle:
//   idle  → telegraph → lunging_out → hold_flat → curl_up →
//   hold_curled → retracting → idle
//
// The curl_up state rotates the rectangle around the base anchor
// (using Phaser's setOrigin(1, 1) so the anchor stays put), sweeping
// the tip from horizontal-left to vertical-up — a windshield-wiper
// motion that visually flicks the roof of the mouth.
//
// Stomp is only valid during the horizontal phases — once the
// tongue curls up the player can't reach it. HP = 4. On the final
// stomp the tongue slouches flat at full extension as a walkable
// ramp the player runs over to reach the exit on the base.

const STATES = {
  IDLE: 'idle',
  TELEGRAPH: 'telegraph',
  LUNGING_OUT: 'lunging_out',
  HOLD_FLAT: 'hold_flat',
  CURL_UP: 'curl_up',
  HOLD_CURLED: 'hold_curled',
  RETRACTING: 'retracting',
  RECOIL: 'recoil',
  SLOUCHED: 'slouched',
};

const DURATIONS = {
  idle: 1500,
  telegraph: 500,
  lunging_out: 400,
  hold_flat: 150,
  curl_up: 400,
  hold_curled: 250,
  retracting: 700, // covers both uncurl and horizontal retract
  recoil: 600,
};

export default class TongueBoss {
  constructor(scene, anchorX, floorY, { reach = 500, height = 56, maxHp = 4, baseW = 120, baseH = 80 } = {}) {
    this.scene = scene;
    this.anchorX = anchorX;
    this.floorY = floorY;
    this.height = height;
    this.baseW = baseW;
    this.baseH = baseH;
    this.maxReach = reach;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.state = STATES.IDLE;
    this.stateStartedAt = scene.time.now;

    // The base — a solid pink hunk at the back-right of the mouth
    // that stays put. The tongue extends from its left edge.
    this.base = scene.add.rectangle(anchorX - baseW / 2, floorY - baseH / 2, baseW, baseH, 0xa05060);

    // The tongue body. Width animates between 0 and maxReach.
    // Origin pinned to the right edge so growing width extends
    // leftward AND so rotating the rectangle pivots around the
    // base anchor.
    this.tongueAnchorX = anchorX - baseW;
    this.tongueAnchorY = floorY - 6;
    this.tongue = scene.add.rectangle(this.tongueAnchorX, this.tongueAnchorY, 0, height, 0xcc5070);
    this.tongue.setOrigin(1, 1);
    scene.physics.add.existing(this.tongue);
    this.tongue.body.setAllowGravity(false);
    this.tongue.body.setImmovable(true);
    this.tongue.tongueBoss = this;
    this.syncBodyToWidth();

    this.hpText = scene.add.text(anchorX - baseW / 2, floorY - baseH - 22, this.hpLabel(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  hpLabel() {
    const hp = Math.max(0, this.hp);
    return `TONGUE ${'♥'.repeat(hp)}${'·'.repeat(this.maxHp - hp)}`;
  }

  // World-space top of the tongue body (used for the stomp check).
  topY() {
    return this.tongue.y - this.tongue.height;
  }

  // Width above zero — used to gate overlap calculations.
  isExtended() {
    return this.tongue.width > 6;
  }

  // The horizontal phases — when the tongue is lying flat and the
  // player can interact with it. Curl phases are out of reach.
  isHorizontal() {
    return (
      this.state === STATES.LUNGING_OUT
      || this.state === STATES.HOLD_FLAT
      || this.state === STATES.SLOUCHED
    );
  }

  isDangerous() {
    // Only active horizontal states inflict push.
    return this.state === STATES.LUNGING_OUT || this.state === STATES.HOLD_FLAT;
  }

  syncBodyToWidth() {
    const w = Math.max(1, this.tongue.width);
    const h = this.tongue.height;
    this.tongue.body.setSize(w, h);
    // Origin (1, 1) means the body offset must keep the right edge pinned.
    this.tongue.body.setOffset(this.tongue.displayWidth - w, this.tongue.displayHeight - h);
  }

  setExtent(extent) {
    // extent in [0, 1] — 0 is fully retracted, 1 is full lunge.
    this.tongue.width = Phaser.Math.Clamp(extent, 0, 1) * this.maxReach;
    this.tongue.displayWidth = this.tongue.width;
    this.syncBodyToWidth();
  }

  setCurlAngle(angleDeg) {
    // angleDeg is the "curl up" amount, 0..90. Phaser's positive
    // angle is screen-clockwise (a left-pointing rod would swing
    // downward), so we negate to swing upward toward the roof of
    // the mouth — the windshield-wiper flick.
    const curl = Phaser.Math.Clamp(angleDeg, 0, 90);
    this.tongue.angle = -curl;
    // Defensive: keep the anchor pinned. The rotation pivots around
    // origin (1,1), so the rectangle's *position* shouldn't drift,
    // but if something upstream wrote NaN we want to recover.
    if (Number.isNaN(this.tongue.x) || Number.isNaN(this.tongue.y)) {
      this.tongue.setPosition(this.tongueAnchorX, this.tongueAnchorY);
    }
  }

  advance(to) {
    this.state = to;
    this.stateStartedAt = this.scene.time.now;
  }

  update() {
    if (this.state === STATES.SLOUCHED) return;
    const now = this.scene.time.now;
    const elapsed = now - this.stateStartedAt;

    switch (this.state) {
      case STATES.IDLE: {
        this.setExtent(0);
        this.setCurlAngle(0);
        this.tongue.fillColor = 0xcc5070;
        if (elapsed >= DURATIONS.idle) this.advance(STATES.TELEGRAPH);
        break;
      }
      case STATES.TELEGRAPH: {
        // Pulsing widen — windup the tongue
        this.tongue.fillColor = 0xff8090;
        const pulse = 0.05 + 0.04 * Math.sin(now / 40);
        this.setExtent(pulse);
        this.setCurlAngle(0);
        if (elapsed >= DURATIONS.telegraph) this.advance(STATES.LUNGING_OUT);
        break;
      }
      case STATES.LUNGING_OUT: {
        this.tongue.fillColor = 0xff5070;
        const t = Phaser.Math.Easing.Quadratic.Out(elapsed / DURATIONS.lunging_out);
        this.setExtent(t);
        this.setCurlAngle(0);
        if (elapsed >= DURATIONS.lunging_out) this.advance(STATES.HOLD_FLAT);
        break;
      }
      case STATES.HOLD_FLAT: {
        this.setExtent(1);
        this.setCurlAngle(0);
        if (elapsed >= DURATIONS.hold_flat) this.advance(STATES.CURL_UP);
        break;
      }
      case STATES.CURL_UP: {
        // Rotate the tongue around the base anchor from horizontal
        // to vertical. Width stays at full extent — the visual is a
        // rigid rod swinging up. Body collision is disabled during
        // this phase via the overlap processCallback.
        this.tongue.fillColor = 0xff6080;
        const t = Phaser.Math.Easing.Quadratic.InOut(elapsed / DURATIONS.curl_up);
        this.setExtent(1);
        this.setCurlAngle(t * 90);
        if (elapsed >= DURATIONS.curl_up) this.advance(STATES.HOLD_CURLED);
        break;
      }
      case STATES.HOLD_CURLED: {
        // Brief beat at the top — the tongue "flicks" the roof.
        this.setExtent(1);
        this.setCurlAngle(90);
        if (elapsed >= DURATIONS.hold_curled) this.advance(STATES.RETRACTING);
        break;
      }
      case STATES.RETRACTING: {
        this.tongue.fillColor = 0xcc5070;
        const t = elapsed / DURATIONS.retracting;
        // First half: uncurl angle 90 → 0. Second half: width 500 → 0.
        if (t < 0.5) {
          this.setExtent(1);
          this.setCurlAngle((1 - t * 2) * 90);
        } else {
          this.setCurlAngle(0);
          this.setExtent(1 - (t - 0.5) * 2);
        }
        if (elapsed >= DURATIONS.retracting) this.advance(STATES.IDLE);
        break;
      }
      case STATES.RECOIL: {
        // Post-stomp shrink. Uncurl quickly if it was curled.
        this.tongue.fillColor = 0x903040;
        const t = elapsed / DURATIONS.recoil;
        this.setCurlAngle(0);
        this.setExtent(1 - Phaser.Math.Easing.Cubic.Out(t));
        if (elapsed >= DURATIONS.recoil) this.advance(STATES.IDLE);
        break;
      }
      default:
        break;
    }
  }

  resolveContact(cheerio) {
    if (this.state === STATES.SLOUCHED) return 'safe';
    if (!this.isExtended()) return 'safe';
    if (!this.isHorizontal()) return 'safe';

    const cheerioOnTop = cheerio.isStomping(this.topY());
    if (cheerioOnTop) return 'stomp';

    if (this.isDangerous()) return 'push';
    return 'safe';
  }

  takeStomp() {
    if (
      this.state === STATES.SLOUCHED
      || this.state === STATES.RECOIL
      || !this.isHorizontal()
    ) return;
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
    this.setCurlAngle(0);
    this.tongue.body.setImmovable(true);
    this.hpText.setVisible(false);
  }

  isDead() {
    return this.state === STATES.SLOUCHED;
  }
}
