import Phaser from 'phaser';

// Patrols a horizontal range, bouncing off invisible turn-around
// points. Stompable: jumping on top kills it. Side contact damages
// the player. Grey-box visual = small red rectangle.
export default class CavityBacterium {
  constructor(scene, x, y, {
    rangeLeft,
    rangeRight,
    speed = 70,
    textureKey = 'cavity-bacterium',
    displayWidth = null,
    displayHeight = null,
    bodyWidth = 90,
    bodyHeight = 72,
  } = {}) {
    this.scene = scene;
    this.alive = true;
    this.rangeLeft = rangeLeft ?? x - 80;
    this.rangeRight = rangeRight ?? x + 80;
    this.speed = speed;

    this.sprite = scene.add.image(x, y, textureKey);
    if (displayWidth != null && displayHeight != null) {
      this.sprite.setDisplaySize(displayWidth, displayHeight);
    }
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(false);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setSize(bodyWidth, bodyHeight);
    this.sprite.body.setVelocityX(-speed);
    this.sprite.bacterium = this;
  }

  update() {
    if (!this.alive) return;
    const b = this.sprite.body;
    if (this.sprite.x < this.rangeLeft) {
      this.sprite.x = this.rangeLeft;
      b.setVelocityX(this.speed);
    } else if (this.sprite.x > this.rangeRight) {
      this.sprite.x = this.rangeRight;
      b.setVelocityX(-this.speed);
    }
  }

  topY() {
    return this.sprite.y - this.sprite.height / 2;
  }

  squash() {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.body.enable = false;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.1,
      alpha: 0,
      duration: 200,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
