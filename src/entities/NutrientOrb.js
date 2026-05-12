import Phaser from 'phaser';

// Nutrient orb — collectible scattered along the small-intestine
// path. Worth +5 points each. Risk-reward: orbs sit near the
// hazards to tempt the player off the safe line.
//
// Grey-box visual: small yellow circle (rectangle approximation),
// gentle bob.
export default class NutrientOrb {
  constructor(scene, x, y) {
    this.scene = scene;
    this.collected = false;

    this.sprite = scene.add.rectangle(x, y, 16, 16, 0xffe070);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.nutrientOrb = this;

    this.bobTween = scene.tweens.add({
      targets: this.sprite,
      y: y - 5,
      duration: 600,
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
      y: this.sprite.y - 24,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 250,
    });
    this.scene.time.delayedCall(260, () => {
      if (this.sprite && this.sprite.scene) this.sprite.destroy();
    });
  }
}
