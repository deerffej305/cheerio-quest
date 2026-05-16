import Phaser from 'phaser';

// Food platform — a chunk of partially-digested food floating on
// the stomach acid. Solid when fresh, but starts dissolving the
// moment the cheerio stands on it. Color shifts tan → brown → red
// as it deteriorates; when fully dissolved the body disables and
// the cheerio falls through.
//
// Grey-box visual: simple tan rectangle, color-shifted over the
// dissolve window.
const DISSOLVE_MS = 1400;

export default class FoodPlatform {
  constructor(scene, x, y, w, h, { dissolves = true, color = 0xc4915a } = {}) {
    this.scene = scene;
    this.dissolves = dissolves;
    this.color = color;
    this.alive = true;
    this.touchedAt = null;

    // Per CJ: visually stretch the bread 50% past the hitbox so the
    // platform reads as a chunky thing-you-can-stand-on. Hitbox stays
    // at the caller's `w`, CENTERED within the wider visual.
    //
    // StaticBody quirks worth noting:
    //   - setSize() on a StaticBody doesn't auto-center like dynamic
    //     bodies do; the offset stays at (0,0) and the body ends up
    //     left-aligned within the image bbox.
    //   - updateFromGameObject() resets body.width/height back to the
    //     image's display dims, undoing setSize. Avoid calling it.
    // The explicit setOffset below centers the 130-wide body inside
    // the 195-wide image (32.5px slack on each side).
    const VISUAL_STRETCH = 1.3;
    this.sprite = scene.add.image(x, y, 'food-platform');
    this.sprite.setDisplaySize(w * VISUAL_STRETCH, h);
    scene.physics.add.existing(this.sprite, true);
    this.sprite.body.setSize(w, h);
    this.sprite.body.setOffset(
      (this.sprite.displayWidth - w) / 2,
      (this.sprite.displayHeight - h) / 2,
    );
    this.sprite.foodPlatform = this;
  }

  noteCheerioStanding() {
    if (!this.dissolves || !this.alive) return;
    if (this.touchedAt == null) this.touchedAt = this.scene.time.now;
  }

  update() {
    if (!this.dissolves || !this.alive || this.touchedAt == null) return;
    const elapsed = this.scene.time.now - this.touchedAt;
    const t = Phaser.Math.Clamp(elapsed / DISSOLVE_MS, 0, 1);
    // Tan → brown → red. Phaser's Color.Interpolate makes the
    // transition feel like the food rotting in real time.
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(this.color),
      Phaser.Display.Color.IntegerToColor(0x701a1a),
      100,
      Math.floor(t * 100),
    );
    this.sprite.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    this.sprite.setAlpha(1 - t * 0.6);
    if (t >= 1) this.dissolve();
  }

  dissolve() {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.body.enable = false;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleY: 0.2,
      duration: 250,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
