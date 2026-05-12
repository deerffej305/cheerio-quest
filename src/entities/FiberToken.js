import Phaser from 'phaser';

// One per room. Big Cheerio + token = +10 points (banked, no double
// grow). Small Cheerio + token = grow back to Big, no points.
// Grey-box visual = green diamond on a slight bob tween.
export default class FiberToken {
  constructor(scene, x, y) {
    this.scene = scene;
    this.collected = false;

    this.sprite = scene.add.rectangle(x, y, 26, 26, 0x40d070);
    this.sprite.setAngle(45);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.fiberToken = this;

    this.baseY = y;
    scene.tweens.add({
      targets: this.sprite,
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.sprite.body.enable = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 30,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 350,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
