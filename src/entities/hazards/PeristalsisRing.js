import Phaser from 'phaser';

// Peristalsis contraction ring. A horizontal bar that spans the tube
// with a gap somewhere — the player must align with the gap to fall
// through unscathed. The ring drifts upward (the "contraction" of
// the esophagus pushing things up against the cheerio's fall).
//
// Grey-box visual: two red rectangles (left + right of the gap),
// each carrying its own arcade body so overlap detection only fires
// when the player actually touches the ring's solid portion.
export default class PeristalsisRing {
  constructor(scene, y, tubeLeft, tubeRight, gapCenterX, {
    gapWidth = 130,
    thickness = 28,
    riseSpeed = 80,
    color = 0xff5060,
  } = {}) {
    this.scene = scene;
    this.riseSpeed = riseSpeed;
    this.alive = true;

    const leftEnd = gapCenterX - gapWidth / 2;
    const rightEnd = gapCenterX + gapWidth / 2;
    const leftSegW = Math.max(2, leftEnd - tubeLeft);
    const rightSegW = Math.max(2, tubeRight - rightEnd);

    this.leftSeg = scene.add.rectangle(tubeLeft + leftSegW / 2, y, leftSegW, thickness, color);
    scene.physics.add.existing(this.leftSeg);
    this.leftSeg.body.setAllowGravity(false);
    this.leftSeg.body.setImmovable(true);
    this.leftSeg.body.setVelocityY(-riseSpeed);
    this.leftSeg.peristalsis = this;

    this.rightSeg = scene.add.rectangle(rightEnd + rightSegW / 2, y, rightSegW, thickness, color);
    scene.physics.add.existing(this.rightSeg);
    this.rightSeg.body.setAllowGravity(false);
    this.rightSeg.body.setImmovable(true);
    this.rightSeg.body.setVelocityY(-riseSpeed);
    this.rightSeg.peristalsis = this;
  }

  // Both segments at the same y; either is fine to query.
  get y() { return this.leftSeg.y; }

  destroy() {
    this.alive = false;
    this.leftSeg.destroy();
    this.rightSeg.destroy();
  }
}
