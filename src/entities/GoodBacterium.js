import Phaser from 'phaser';

// Good bacteria (Lactobacillus, Bifidobacterium analog) — floating
// collectible in the large intestine. +5 points each. Cosmetically
// distinct from nutrient orbs: green rounded blob.
export default class GoodBacterium {
  constructor(scene, x, y) {
    this.scene = scene;
    this.collected = false;

    this.sprite = scene.add.rectangle(x, y, 18, 18, 0x60d860);
    this.sprite.setAngle(15);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.goodBacterium = this;

    this.bobTween = scene.tweens.add({
      targets: this.sprite,
      y: y - 4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    if (this.sprite.body) this.sprite.body.enable = false;
    if (this.bobTween) {
      this.bobTween.stop();
      this.bobTween.remove();
      this.bobTween = null;
    }
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 20,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 250,
    });
    this.scene.time.delayedCall(260, () => {
      if (this.sprite && this.sprite.scene) this.sprite.destroy();
    });
  }
}
