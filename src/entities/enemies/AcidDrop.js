import Phaser from 'phaser';

// Acid drop — a goomba analog patrolling a food platform. Walks
// back and forth, stompable for +5 points (the bonus per the
// design doc). Side contact damages the cheerio.
//
// Grey-box visual: green-yellow rectangle.
export default class AcidDrop {
  constructor(scene, x, y, { rangeLeft, rangeRight, speed = 60 } = {}) {
    this.scene = scene;
    this.alive = true;
    this.rangeLeft = rangeLeft ?? x - 80;
    this.rangeRight = rangeRight ?? x + 80;
    this.speed = speed;

    this.sprite = scene.add.image(x, y, 'acid-drop');
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setSize(26, 22);
    this.sprite.body.setVelocityX(-speed);
    this.sprite.acidDrop = this;
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
