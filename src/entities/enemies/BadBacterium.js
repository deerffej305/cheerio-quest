import Phaser from 'phaser';

// Bad bacteria (E. coli O157, C. difficile analog) — patrols the
// haustra of the large intestine. Same stompable-patroller
// behavior as the mouth's cavity bacterium, but a darker red and
// slightly faster so the colon labyrinth feels distinct.
export default class BadBacterium {
  constructor(scene, x, y, { rangeLeft, rangeRight, speed = 80 } = {}) {
    this.scene = scene;
    this.alive = true;
    this.rangeLeft = rangeLeft ?? x - 90;
    this.rangeRight = rangeRight ?? x + 90;
    this.speed = speed;

    this.sprite = scene.add.image(x, y, 'bad-bacterium');
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setSize(30, 24);
    this.sprite.body.setVelocityX(-speed);
    this.sprite.badBacterium = this;
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
