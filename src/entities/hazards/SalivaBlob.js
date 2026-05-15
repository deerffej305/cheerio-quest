import Phaser from 'phaser';

// Saliva blob — sits on the mouth floor near the tongue. Slowly
// pulses (alpha + scale) so it reads as "wet" / alive. Contact
// dissolves the Cheerio regardless of size: it's the lava rule
// applied to organic chemistry. No stomp option.
//
// Grey-box visual: pale blue-white translucent ellipse, drawn as a
// rectangle for now (we can swap for an Arc/Ellipse in the art pass).
export default class SalivaBlob {
  constructor(scene, x, y, { width = 60, height = 24 } = {}) {
    this.scene = scene;

    this.sprite = scene.add.image(x, y, 'saliva-blob');
    this.sprite.setDisplaySize(width, height);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    this.sprite.body.setSize(width, height);
    this.sprite.salivaBlob = this;

    // Wet pulse animation — alpha + slight scale swell so it
    // signals "stay away" without needing motion.
    scene.tweens.add({
      targets: this.sprite,
      alpha: 0.55,
      scaleX: 1.08,
      scaleY: 0.85,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  isLethal() {
    return true;
  }
}
