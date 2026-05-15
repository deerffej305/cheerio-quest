import Phaser from 'phaser';

// One segment of the esophagus muscle wall. A pair of blocks (left
// and right) anchored at the tube walls. The blocks have a constant
// baseExtension that's always visible (so the wall looks like a
// stack of muscle ribs), and they extrude inward toward the middle
// of the tube when squeezing.
//
// Phase + extension are pushed in from outside (see RoomEsophagus
// updateWave): the room owns a single waveY that descends through
// the tube, and each segment computes its state from its distance
// to that wave. This recreates the "death-line that descends"
// feeling, but visualized as muscle segments closing inward.
export default class PeristalsisCrusher {
  constructor(scene, y, tubeLeft, tubeRight, {
    thickness = 150,
    baseExtension = 14,
    baseColor = 0x9a1828,
    edgeColor = 0x4a1020,
    telegraphColor = 0xffd040,
    deadlyColor = 0xff2030,
  } = {}) {
    this.scene = scene;
    this.y = y;
    this.tubeLeft = tubeLeft;
    this.tubeRight = tubeRight;
    this.thickness = thickness;
    this.baseExtension = baseExtension;
    this.maxReach = (tubeRight - tubeLeft) / 2;
    this.baseColor = baseColor;
    this.telegraphColor = telegraphColor;
    this.deadlyColor = deadlyColor;
    this.deadly = false;
    this.alive = true;

    this.leftBlock = scene.add.rectangle(tubeLeft, y, baseExtension, thickness, baseColor);
    this.leftBlock.setOrigin(0, 0.5);
    this.leftBlock.setStrokeStyle(2, edgeColor);
    scene.physics.add.existing(this.leftBlock, true);
    this.leftBlock.crusher = this;

    this.rightBlock = scene.add.rectangle(tubeRight, y, baseExtension, thickness, baseColor);
    this.rightBlock.setOrigin(1, 0.5);
    this.rightBlock.setStrokeStyle(2, edgeColor);
    scene.physics.add.existing(this.rightBlock, true);
    this.rightBlock.crusher = this;
  }

  // mode: 'idle' | 'telegraph' | 'closed' | 'retracting'
  // extension: how far each block extends from its wall toward the middle (px)
  setState(extension, mode) {
    const w = Math.max(this.baseExtension, extension);

    this.leftBlock.setSize(w, this.thickness);
    this.leftBlock.body.setSize(w, this.thickness);
    this.leftBlock.body.position.set(this.tubeLeft, this.y - this.thickness / 2);
    this.leftBlock.body.updateFromGameObject();

    this.rightBlock.setSize(w, this.thickness);
    this.rightBlock.body.setSize(w, this.thickness);
    this.rightBlock.body.position.set(this.tubeRight - w, this.y - this.thickness / 2);
    this.rightBlock.body.updateFromGameObject();

    let color = this.baseColor;
    if (mode === 'telegraph') color = this.telegraphColor;
    else if (mode === 'closed') color = this.deadlyColor;
    this.leftBlock.setFillStyle(color);
    this.rightBlock.setFillStyle(color);

    this.deadly = mode === 'closed';
  }

  isDeadly() { return this.deadly; }

  destroy() {
    this.alive = false;
    this.leftBlock.destroy();
    this.rightBlock.destroy();
  }
}
