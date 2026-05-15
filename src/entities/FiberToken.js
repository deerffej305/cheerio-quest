import Phaser from 'phaser';

// One per room. Big Cheerio + token = +10 points (banked, no double
// grow). Small Cheerio + token = grow back to Big, no points.
// Grey-box visual = green diamond on a slight bob tween.
export default class FiberToken {
  constructor(scene, x, y) {
    this.scene = scene;
    this.collected = false;

    this.sprite = scene.add.image(x, y, 'fiber-token');
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.body.setSize(26, 26);
    this.sprite.fiberToken = this;

    this.baseY = y;
    // Hold an explicit reference so we can stop the bob deterministically
    // on pickup — killTweensOf with infinite-repeat tweens has been
    // flaky in practice.
    this.bobTween = scene.tweens.add({
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
    if (this.sprite.body) this.sprite.body.enable = false;

    // Stop the infinite bob explicitly, then kill any other tweens
    // that might be touching this sprite.
    if (this.bobTween) {
      this.bobTween.stop();
      this.bobTween.remove();
      this.bobTween = null;
    }
    this.scene.tweens.killTweensOf(this.sprite);

    // Pickup pop animation. Don't rely on tween onComplete to
    // destroy — schedule the destroy on the time plugin so a
    // mid-frame scene shutdown can't strand the cleanup.
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 30,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 350,
    });
    this.scene.time.delayedCall(360, () => {
      if (this.sprite && this.sprite.scene) this.sprite.destroy();
    });
  }
}
