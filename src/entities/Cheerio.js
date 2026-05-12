import Phaser from 'phaser';

const MOVE_SPEED = 280;
const JUMP_VELOCITY_BIG = -780;
const JUMP_VELOCITY_SMALL = -520; // Big jumps 50% higher than Small.
const COYOTE_MS = 90;
const HIT_INVULN_MS = 1100;

const BIG_SIZE = 48;
const SMALL_SIZE = 28;
const BIG_COLOR = 0xf4c87a;
const SMALL_COLOR = 0xf0a050;

// The player character. Two states:
//   - 'big'   : one hit absorbs a damage event and shrinks to small.
//   - 'small' : one hit costs the room (-20 points, restart).
// Real ring-with-eyes sprite ships in the Phase 7 art pass — for the
// grey-box this is a tan rectangle whose size encodes state.
export default class Cheerio {
  constructor(scene, x, y) {
    this.scene = scene;
    this.input = scene.inputs;
    this.state = 'big';
    this.lastGroundedAt = 0;
    this.invulnUntil = 0;
    this.displacedUntil = 0;
    this.alive = true;

    this.sprite = scene.add.rectangle(x, y, BIG_SIZE, BIG_SIZE, BIG_COLOR);
    scene.physics.add.existing(this.sprite);

    const body = this.sprite.body;
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(MOVE_SPEED * 1.5, 1600);

    // Keep handles to commonly-touched data on the sprite for collider
    // callbacks that only get the GameObject.
    this.sprite.cheerio = this;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get body() { return this.sprite.body; }

  freezeControl(frozen) {
    this.controlFrozen = frozen;
    if (frozen) this.body.setVelocityX(0);
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    this.body.reset(x, y);
  }

  update(_delta) {
    if (!this.alive) return;
    const body = this.body;
    const now = this.scene.time.now;

    if (body.blocked.down || body.touching.down) {
      this.lastGroundedAt = now;
    }

    if (this.controlFrozen) {
      body.setVelocityX(0);
      return;
    }

    // During a displacement window (e.g., a poop displacer shoved
    // us), don't touch velocityX — let the externally applied push
    // actually carry us before player input takes back over.
    const displaced = now < this.displacedUntil;
    if (!displaced) {
      if (this.input.isLeftDown()) {
        body.setVelocityX(-MOVE_SPEED);
      } else if (this.input.isRightDown()) {
        body.setVelocityX(MOVE_SPEED);
      } else {
        body.setVelocityX(0);
      }
    }

    const inCoyoteWindow = now - this.lastGroundedAt <= COYOTE_MS;
    if (this.input.wasJumpJustPressed() && inCoyoteWindow) {
      const jv = this.state === 'big' ? JUMP_VELOCITY_BIG : JUMP_VELOCITY_SMALL;
      body.setVelocityY(jv);
      this.lastGroundedAt = 0;
    }

    // Damage-flash blink while invulnerable.
    if (now < this.invulnUntil) {
      this.sprite.setAlpha((Math.floor(now / 80) % 2) ? 0.4 : 1);
    } else if (this.sprite.alpha !== 1) {
      this.sprite.setAlpha(1);
    }
  }

  // External push (e.g., poop displacer) — sets velocity AND holds
  // input-control off for a short window so the impulse can carry.
  applyDisplacement(vx, vy = null, durationMs = 280) {
    this.body.setVelocityX(vx);
    if (vy != null) this.body.setVelocityY(vy);
    this.displacedUntil = this.scene.time.now + durationMs;
  }

  isStomping(targetTopY) {
    // Standard platformer stomp check: cheerio is falling and its
    // bottom edge is close to the target's top edge.
    return this.body.velocity.y > 0 && this.body.bottom <= targetTopY + 12;
  }

  isInvulnerable() {
    return this.scene.time.now < this.invulnUntil;
  }

  // One-stop entry point for "the player got hit". Big → Small (no
  // point loss); Small → die. Returns 'shrunk' | 'died' | 'ignored'.
  takeHit() {
    if (!this.alive || this.isInvulnerable()) return 'ignored';
    if (this.state === 'big') {
      this.shrink();
      this.invulnUntil = this.scene.time.now + HIT_INVULN_MS;
      return 'shrunk';
    }
    this.die();
    return 'died';
  }

  shrink() {
    if (this.state === 'small') return;
    this.state = 'small';
    this.sprite.setSize(SMALL_SIZE, SMALL_SIZE);
    this.sprite.fillColor = SMALL_COLOR;
    this.body.setSize(SMALL_SIZE, SMALL_SIZE);
  }

  grow() {
    if (this.state === 'big') return false;
    this.state = 'big';
    this.sprite.setSize(BIG_SIZE, BIG_SIZE);
    this.sprite.fillColor = BIG_COLOR;
    this.body.setSize(BIG_SIZE, BIG_SIZE);
    return true;
  }

  die() {
    this.alive = false;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.sprite.setAlpha(0.2);
  }
}
