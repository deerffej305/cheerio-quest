import Phaser from 'phaser';

// Poop displacer — patrols the anus maze. Per the design doc:
// "poop / displacement enemies push them aside. No damage, just
// displacement." So on contact this enemy shoves the cheerio in
// whichever direction the displacer is currently walking, with a
// brief upward pop, then carries on patrolling. The player scrambles
// to recover and waits for the next fart.
//
// Grey-box visual: a brown rounded blob.
export default class PoopDisplacer {
  constructor(scene, x, y, { rangeLeft, rangeRight, speed = 70, color = 0x7a4220 } = {}) {
    this.scene = scene;
    this.alive = true;
    this.rangeLeft = rangeLeft ?? x - 80;
    this.rangeRight = rangeRight ?? x + 80;
    this.speed = speed;

    this.sprite = scene.add.rectangle(x, y, 34, 26, color);
    this.sprite.setStrokeStyle(2, 0x4a2010);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setVelocityX(-speed);
    this.sprite.poopDisplacer = this;
  }

  // True if moving rightward (used to decide push direction).
  isMovingRight() {
    return this.sprite.body.velocity.x > 0;
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
}
