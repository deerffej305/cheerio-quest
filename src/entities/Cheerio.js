import Phaser from 'phaser';
import { sound } from '../systems/SoundManager.js';

const MOVE_SPEED = 280;
// Per CJ: Small and Big jump the same height so every essential jump
// is reachable in either state. Being Big is now purely "absorb one
// hit", not a movement advantage.
const JUMP_VELOCITY = -780;
// Variable jump: tap = short hop, hold = full jump. On early release
// while still rising, multiply current upward velocity by this.
const JUMP_CUT_MULTIPLIER = 0.4;
const COYOTE_MS = 90;
const HIT_INVULN_MS = 1100;

// 3× the original brief sizes (per WIRE_IN_FIXES.md). setDisplaySize
// uses these constants for the visual; physics body sized to match.
const BIG_SIZE = 144;
const SMALL_SIZE = 84;
const TEXTURE_BIG = 'crispy-big';
const TEXTURE_SMALL = 'crispy-small';

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

    this.sprite = scene.add.image(x, y, TEXTURE_BIG);
    // Texture is loaded at native 256px; downscale to the in-game
    // size. Same on every state swap below.
    this.sprite.setDisplaySize(BIG_SIZE, BIG_SIZE);
    scene.physics.add.existing(this.sprite);

    const body = this.sprite.body;
    body.setCollideWorldBounds(true);
    body.setSize(BIG_SIZE, BIG_SIZE);
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
      body.setVelocityY(JUMP_VELOCITY);
      this.lastGroundedAt = 0;
      this.jumpCutAvailable = true;
      sound.play('jump');
    }

    // Variable jump height: if the jump button is released while
    // still rising, snip the upward velocity. Burns the cut so a
    // single jump only gets cut once.
    if (this.jumpCutAvailable && !this.input.isJumpDown() && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * JUMP_CUT_MULTIPLIER);
      this.jumpCutAvailable = false;
    }
    // Reset on landing so the next jump can be cut again.
    if (body.blocked.down || body.touching.down) {
      this.jumpCutAvailable = false;
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
      sound.play('damage');
      return 'shrunk';
    }
    sound.play('death');
    this.die();
    return 'died';
  }

  shrink() {
    if (this.state === 'small') return;
    this.state = 'small';
    this.sprite.setTexture(TEXTURE_SMALL);
    this.sprite.setDisplaySize(SMALL_SIZE, SMALL_SIZE);
    this.body.setSize(SMALL_SIZE, SMALL_SIZE);
  }

  grow() {
    if (this.state === 'big') return false;
    this.state = 'big';
    this.sprite.setTexture(TEXTURE_BIG);
    this.sprite.setDisplaySize(BIG_SIZE, BIG_SIZE);
    this.body.setSize(BIG_SIZE, BIG_SIZE);
    return true;
  }

  // type: 'dissolve' (acid / saliva), 'squish' (chomp / blocker),
  // 'fall' (off-screen / off-stage), 'fade' (default / generic).
  // These are the polish-phase death animations from design §13.
  die(type = 'fade') {
    if (!this.alive) return;
    this.alive = false;
    this.body.setVelocity(0, 0);
    this.body.enable = false;

    const sprite = this.sprite;
    this.scene.tweens.killTweensOf(sprite);

    switch (type) {
      case 'dissolve': {
        // Acid / saliva — wiggle, fade, dwindle to nothing.
        sprite.setTint(0xa0ff60);
        this.scene.tweens.add({
          targets: sprite,
          scaleX: 0.3, scaleY: 0.1,
          alpha: 0,
          angle: 720,
          duration: 900,
          ease: 'Cubic.In',
        });
        break;
      }
      case 'squish': {
        // Chomp / blocker — flattened pancake.
        this.scene.tweens.add({
          targets: sprite,
          scaleY: 0.15, scaleX: 1.6,
          alpha: 0.4,
          duration: 240,
          ease: 'Quadratic.Out',
        });
        break;
      }
      case 'fall': {
        // Off-screen left — keep falling, spin out, fade.
        this.body.enable = true;
        this.body.setAllowGravity(true);
        this.body.setVelocity(-180, -240);
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          angle: 540,
          duration: 1000,
        });
        break;
      }
      default: {
        // Generic damage death — dimmed, slight droop.
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0.2,
          scaleY: 0.7,
          duration: 350,
        });
      }
    }
  }
}
