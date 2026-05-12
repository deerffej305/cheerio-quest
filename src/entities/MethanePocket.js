import Phaser from 'phaser';

// Methane gas pocket — a bouncy fart-bubble platform. Landing on
// it launches the cheerio higher than a normal jump. Visual: a
// translucent green dome with a gentle pulse.
const BOUNCE_VY = -900;

export default class MethanePocket {
  constructor(scene, x, y, w = 90, h = 26) {
    this.scene = scene;
    this.sprite = scene.add.rectangle(x, y, w, h, 0x70d0a0, 0.7);
    scene.physics.add.existing(this.sprite, true);
    this.sprite.methanePocket = this;

    scene.tweens.add({
      targets: this.sprite,
      scaleY: 1.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  bounce(cheerio) {
    cheerio.body.setVelocityY(BOUNCE_VY);
    // Quick squash + restore tween for satisfying feedback.
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.5,
      duration: 90,
      yoyo: true,
      ease: 'Quadratic.Out',
    });
  }
}
