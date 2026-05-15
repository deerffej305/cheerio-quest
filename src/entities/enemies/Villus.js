import Phaser from 'phaser';

// Villus — a wavy tentacle obstacle in the small intestine. Stands
// rooted on the floor and sways side to side. Stompable from above.
//
// Grey-box visual: tall pink rectangle that wobbles its angle on a
// sine wave (cheap "wavy tentacle" feel).
export default class Villus {
  constructor(scene, x, floorY, { height = 110, swayDeg = 22, swaySpeed = 0.002, color = 0xff90b8 } = {}) {
    this.scene = scene;
    this.alive = true;
    this.swayDeg = swayDeg;
    this.swaySpeed = swaySpeed;
    this.x = x;
    this.floorY = floorY;
    this.spawnedAt = scene.time.now;

    this.height = height;
    this.sprite = scene.add.image(x, floorY, 'villus');
    this.sprite.setDisplaySize(26, height);
    this.sprite.setOrigin(0.5, 1); // anchor at the base, so it sways from the floor
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.body.setSize(26, height);
    this.sprite.body.setOffset(-13, -height); // re-center with origin 0.5, 1
    this.sprite.villus = this;
  }

  topY() {
    return this.sprite.y - this.height;
  }

  update() {
    if (!this.alive) return;
    const t = (this.scene.time.now - this.spawnedAt) * this.swaySpeed;
    this.sprite.angle = Math.sin(t) * this.swayDeg;
  }

  squash() {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.body.enable = false;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.15,
      alpha: 0,
      duration: 220,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
