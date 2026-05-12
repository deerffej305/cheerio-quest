import Phaser from 'phaser';

const MOVE_SPEED = 280;
const JUMP_VELOCITY = -650;
const COYOTE_MS = 90;

// Placeholder Cheerio: a tan rectangle that runs left/right and jumps.
// Real ring-with-eyes sprite ships in the Phase 7 art pass.
export default class Cheerio {
  constructor(scene, x, y) {
    this.scene = scene;
    this.input = scene.inputs;

    this.sprite = scene.add.rectangle(x, y, 40, 40, 0xf4c87a);
    scene.physics.add.existing(this.sprite);

    const body = this.sprite.body;
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(MOVE_SPEED * 1.5, 1600);

    this.lastGroundedAt = 0;
  }

  update(_delta) {
    const body = this.sprite.body;
    const now = this.scene.time.now;

    if (body.blocked.down || body.touching.down) {
      this.lastGroundedAt = now;
    }

    if (this.input.isLeftDown()) {
      body.setVelocityX(-MOVE_SPEED);
    } else if (this.input.isRightDown()) {
      body.setVelocityX(MOVE_SPEED);
    } else {
      body.setVelocityX(0);
    }

    const inCoyoteWindow = now - this.lastGroundedAt <= COYOTE_MS;
    if (this.input.wasJumpJustPressed() && inCoyoteWindow) {
      body.setVelocityY(JUMP_VELOCITY);
      this.lastGroundedAt = 0;
    }
  }
}
