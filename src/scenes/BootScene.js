import Phaser from 'phaser';

// Boot scene runs once at startup. Currently used to generate the
// procedural placeholder textures (Crispy the yellow-ring cheerio,
// at two sizes) so other scenes can pull them by key. Real PNG
// sprites replace these in the Phase 7 art pass.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // No external assets yet.
  }

  create() {
    this.makeRingTexture('crispy-big', 48, 8);
    this.makeRingTexture('crispy-small', 28, 5);
    this.scene.start('Title');
  }

  // A yellow donut: outlined circle of the given outer size and
  // ring thickness. Origin is the texture's top-left so it composes
  // cleanly with arcade physics bodies.
  makeRingTexture(key, size, ringWidth) {
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(ringWidth, 0xffd040);
    g.strokeCircle(size / 2, size / 2, size / 2 - ringWidth / 2);
    // A subtle darker outline so the ring reads against pink/red rooms.
    g.lineStyle(2, 0xc09020);
    g.strokeCircle(size / 2, size / 2, size / 2 - ringWidth / 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
