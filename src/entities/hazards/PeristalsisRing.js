import Phaser from 'phaser';

// Peristalsis ring obstacle in the Esophagus. Two solid platform
// segments flanking a gap — Crispy can land on them or walk off
// into the gap to keep falling. They DON'T damage on contact (per
// 2026-05-14 design correction). The real threat in the Esophagus
// is the descending crunch wave above the cheerio — landing here
// slows your descent, which lets the wave catch up.
export default class PeristalsisRing {
  constructor(scene, y, tubeLeft, tubeRight, gapCenterX, {
    gapWidth = 130,
    thickness = 22,
    color = 0xff5060,
  } = {}) {
    this.scene = scene;
    this.alive = true;

    const leftEnd = gapCenterX - gapWidth / 2;
    const rightEnd = gapCenterX + gapWidth / 2;
    const leftSegW = Math.max(2, leftEnd - tubeLeft);
    const rightSegW = Math.max(2, tubeRight - rightEnd);

    this.leftSeg = scene.add.image(tubeLeft + leftSegW / 2, y, 'peristalsis-ring-left');
    this.leftSeg.setDisplaySize(leftSegW, thickness);
    scene.physics.add.existing(this.leftSeg, true);
    this.leftSeg.peristalsis = this;

    this.rightSeg = scene.add.image(rightEnd + rightSegW / 2, y, 'peristalsis-ring-right');
    this.rightSeg.setDisplaySize(rightSegW, thickness);
    scene.physics.add.existing(this.rightSeg, true);
    this.rightSeg.peristalsis = this;
  }

  get y() { return this.leftSeg.y; }

  destroy() {
    this.alive = false;
    this.leftSeg.destroy();
    this.rightSeg.destroy();
  }
}
