import Phaser from 'phaser';

// Tongue boss — anchored at the back-right of the mouth. Modeled
// as two segments joined at a bend point:
//
//     ┌────── proximal ──────┐  ┌────── distal ──────┐  ┌ base ┐
//                                                              ▲
//                                                          anchorX
//
// The proximal segment is short (~150px) and attached to the base.
// It always stays horizontal. The distal segment is the longer
// portion (~350px) that does the flicking — during CURL_UP it
// rotates around the joint (origin (1,1) on the distal places its
// pivot at the bend point), arcing the tip up toward the roof of
// the mouth.
//
// State machine:
//   idle → telegraph → lunging_out (proximal then distal extend)
//   → hold_flat → curl_up (distal rotates 0→90°) → hold_curled
//   → retracting (distal uncurls, then both retract) → idle.
//
// On the 4th stomp the tongue slouches flat at full extension —
// a walkable ramp/floor extending leftward from the base, which
// the player runs over to reach the exit on the base.

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
  lunging_out: 450,
  hold_flat: 150,
  curl_up: 400,
  hold_curled: 250,
  retracting: 700,
  recoil: 600,
};

export default class TongueBoss {
  constructor(scene, anchorX, floorY, {
    reach = 500,
    height = 56,
    maxHp = 4,
    baseW = 120,
    baseH = 80,
    jointDist = 150,
  } = {}) {
    this.scene = scene;
    this.anchorX = anchorX;
    this.floorY = floorY;
    this.height = height;
    this.baseW = baseW;
    this.baseH = baseH;
    this.maxReach = reach;
    this.proxLen = jointDist;
    this.distLen = reach - jointDist;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.state = STATES.IDLE;
    this.stateStartedAt = scene.time.now;

    // Base — solid pink hunk at the back-right of the mouth.
    this.base = scene.add.rectangle(anchorX - baseW / 2, floorY - baseH / 2, baseW, baseH, 0xa05060);

    // Common anchor for the right edge of the proximal (sits just
    // left of the base, at floor level).
    this.tongueAnchorX = anchorX - baseW;
    this.tongueAnchorY = floorY - 6;

    // Proximal segment — right-edge-anchored at the tongue anchor.
    // setOrigin(1, 1) places origin at bottom-right so growing
    // width extends leftward.
    this.tongueProx = scene.add.rectangle(this.tongueAnchorX, this.tongueAnchorY, 1, height, 0xcc5070);
    this.tongueProx.setOrigin(1, 1);
    scene.physics.add.existing(this.tongueProx);
    this.tongueProx.body.setAllowGravity(false);
    this.tongueProx.body.setImmovable(true);
    this.tongueProx.tongueBoss = this;
    this.tongueProx.segmentRole = 'proximal';

    // Distal segment — right-edge-anchored at the JOINT (which moves
    // with the proximal's left edge). Origin (1,1) so rotation
    // pivots around the joint, sweeping the tip upward.
    this.tongueDist = scene.add.rectangle(this.tongueAnchorX, this.tongueAnchorY, 1, height, 0xcc5070);
    this.tongueDist.setOrigin(1, 1);
    scene.physics.add.existing(this.tongueDist);
    this.tongueDist.body.setAllowGravity(false);
    this.tongueDist.body.setImmovable(true);
    this.tongueDist.tongueBoss = this;
    this.tongueDist.segmentRole = 'distal';

    // Initialize to fully retracted.
    this.setExtent(0);
    this.setCurlAngle(0);

    this.hpText = scene.add.text(anchorX - baseW / 2, floorY - baseH - 22, this.hpLabel(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // Convenience: the segments array, used by RoomMouth when wiring
  // up physics handlers. Order: proximal first.
  get segments() {
    return [this.tongueProx, this.tongueDist];
  }

  hpLabel() {
    const hp = Math.max(0, this.hp);
    return `TONGUE ${'♥'.repeat(hp)}${'·'.repeat(this.maxHp - hp)}`;
  }

  // World-space top of the proximal segment, used for stomp checks
  // against the horizontal portion of the tongue.
  topY() {
    return this.tongueProx.y - this.tongueProx.displayHeight;
  }

  isExtended() {
    return this.tongueProx.displayWidth + this.tongueDist.displayWidth > 6;
  }

  // True when the tongue is lying flat (no curl). The stomp/push
  // overlap is gated by this — the player can't reach the tongue
  // once it curls up.
  isHorizontal() {
    return (
      this.state === STATES.LUNGING_OUT
      || this.state === STATES.HOLD_FLAT
      || this.state === STATES.SLOUCHED
    );
  }

  isDangerous() {
    return this.state === STATES.LUNGING_OUT || this.state === STATES.HOLD_FLAT;
  }

  // Resize a segment using Phaser's setSize, which updates both the
  // GameObject's width/height AND the underlying geom + body, so
  // the rectangle actually re-tessellates. (Setting .width directly
  // only updates the transform — the rendered geom keeps its
  // constructor size.)
  setSegmentWidth(seg, w) {
    const safe = Math.max(1, w);
    seg.setSize(safe, this.height);
    seg.body.setSize(safe, this.height);
    // Origin (1, 1) means the body needs negative offset to align
    // with the rendered left-extending rectangle.
    seg.body.setOffset(-safe, -this.height);
  }

  setExtent(extent) {
    const total = Phaser.Math.Clamp(extent, 0, 1) * this.maxReach;
    const proxW = Math.min(this.proxLen, total);
    const distW = Math.max(0, total - this.proxLen);

    this.setSegmentWidth(this.tongueProx, proxW);
    // The distal hangs off the proximal's left edge — its pivot is
    // the joint at anchorX - proxW.
    this.tongueDist.setPosition(this.tongueAnchorX - proxW, this.tongueAnchorY);
    this.setSegmentWidth(this.tongueDist, distW);
  }

  setCurlAngle(angleDeg) {
    // angleDeg is the "curl up" amount, 0..90.
    // For a left-extending rectangle pivoted at origin (1,1), a
    // POSITIVE Phaser angle (which is clockwise on screen) sweeps
    // the rectangle's tip up and slightly to the right — exactly
    // the windshield-wiper flick we want, hinged at the joint.
    const curl = Phaser.Math.Clamp(angleDeg, 0, 90);
    this.tongueDist.angle = curl;
    if (Number.isNaN(this.tongueDist.x) || Number.isNaN(this.tongueDist.y)) {
      this.tongueDist.setPosition(this.tongueAnchorX - this.tongueProx.displayWidth, this.tongueAnchorY);
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
        this.tongueProx.fillColor = 0xcc5070;
        this.tongueDist.fillColor = 0xcc5070;
        if (elapsed >= DURATIONS.idle) this.advance(STATES.TELEGRAPH);
        break;
      }
      case STATES.TELEGRAPH: {
        this.tongueProx.fillColor = 0xff8090;
        this.tongueDist.fillColor = 0xff8090;
        const pulse = 0.06 + 0.03 * Math.sin(now / 40);
        this.setExtent(pulse);
        this.setCurlAngle(0);
        if (elapsed >= DURATIONS.telegraph) this.advance(STATES.LUNGING_OUT);
        break;
      }
      case STATES.LUNGING_OUT: {
        this.tongueProx.fillColor = 0xff5070;
        this.tongueDist.fillColor = 0xff5070;
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
        // Distal swings around the joint. Proximal stays flat.
        this.tongueProx.fillColor = 0xff5070;
        this.tongueDist.fillColor = 0xff6080;
        this.setExtent(1);
        const t = Phaser.Math.Easing.Quadratic.InOut(elapsed / DURATIONS.curl_up);
        this.setCurlAngle(t * 90);
        if (elapsed >= DURATIONS.curl_up) this.advance(STATES.HOLD_CURLED);
        break;
      }
      case STATES.HOLD_CURLED: {
        this.setExtent(1);
        this.setCurlAngle(90);
        if (elapsed >= DURATIONS.hold_curled) this.advance(STATES.RETRACTING);
        break;
      }
      case STATES.RETRACTING: {
        this.tongueProx.fillColor = 0xcc5070;
        this.tongueDist.fillColor = 0xcc5070;
        const t = elapsed / DURATIONS.retracting;
        // First half: uncurl. Second half: retract horizontally.
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
        this.tongueProx.fillColor = 0x903040;
        this.tongueDist.fillColor = 0x903040;
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
    this.tongueProx.fillColor = 0x884050;
    this.tongueDist.fillColor = 0x884050;
    this.setExtent(1);
    this.setCurlAngle(0);
    this.tongueProx.body.setImmovable(true);
    this.tongueDist.body.setImmovable(true);
    this.hpText.setVisible(false);
  }

  isDead() {
    return this.state === STATES.SLOUCHED;
  }
}
