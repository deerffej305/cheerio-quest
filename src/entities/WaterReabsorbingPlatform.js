import Phaser from 'phaser';

// Water-reabsorbing platform — represents the colon doing its job:
// water gets sucked out, the platform shrinks underfoot. Starts
// full-width, narrows over a few seconds of being stood on, then
// vanishes. Don't linger.
const SHRINK_MS = 1600;

export default class WaterReabsorbingPlatform {
  constructor(scene, x, y, w, h, { color = 0x9c6a3a } = {}) {
    this.scene = scene;
    this.fullWidth = w;
    this.height = h;
    this.alive = true;
    this.touchedAt = null;
    this.color = color;

    this.sprite = scene.add.image(x, y, 'water-platform');
    this.sprite.setDisplaySize(w, h);
    scene.physics.add.existing(this.sprite, true);
    this.sprite.body.setSize(w, h);
    this.sprite.waterPlatform = this;
  }

  noteCheerioStanding() {
    if (!this.alive) return;
    if (this.touchedAt == null) this.touchedAt = this.scene.time.now;
  }

  update() {
    if (!this.alive || this.touchedAt == null) return;
    const elapsed = this.scene.time.now - this.touchedAt;
    const t = Phaser.Math.Clamp(elapsed / SHRINK_MS, 0, 1);
    const newW = this.fullWidth * (1 - t);
    if (newW <= 4) { this.dissolve(); return; }
    // setSize + refreshBody so the static body shrinks with the
    // visual; otherwise the cheerio keeps standing on invisible
    // edges of the original platform.
    this.sprite.setDisplaySize(newW, this.height);
    this.sprite.body.setSize(newW, this.height);
    this.sprite.body.updateFromGameObject();
  }

  dissolve() {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.body.enable = false;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 180,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
