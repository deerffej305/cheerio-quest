import Phaser from 'phaser';

// Microvilli — a tight cluster of small spikes lining the floor (or
// ceiling). Static; any contact damages the cheerio. Not stompable.
//
// Grey-box visual: a strip of small darker rectangles tightly
// packed, mounted on the floor surface.
export default class Microvilli {
  constructor(scene, x, floorY, { spikeCount = 4, color = 0xb8e0a0, attach = 'floor' } = {}) {
    this.scene = scene;
    this.attach = attach;
    const spikeW = 8;
    const spikeH = 18;
    const gap = 2;
    const totalW = spikeCount * spikeW + (spikeCount - 1) * gap;
    const startX = x - totalW / 2 + spikeW / 2;

    this.spikes = [];
    for (let i = 0; i < spikeCount; i++) {
      const sx = startX + i * (spikeW + gap);
      const sy = attach === 'floor'
        ? floorY - spikeH / 2
        : floorY + spikeH / 2;
      const sp = scene.add.image(sx, sy, 'microvilli-spike');
      sp.setDisplaySize(spikeW, spikeH);
      scene.physics.add.existing(sp, true);
      sp.body.setSize(spikeW, spikeH);
      sp.microvilli = this;
      this.spikes.push(sp);
    }
    this.x = x;
    this.y = floorY;
  }

  get bodies() {
    return this.spikes;
  }
}
