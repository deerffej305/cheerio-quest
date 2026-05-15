import Phaser from 'phaser';

// Peristalsis crusher — two blocks anchored to the left and right
// walls of the esophagus that periodically extend inward, meeting
// in the middle. Cycle phases:
//   idle       — fully retracted, harmless
//   telegraph  — flashing, about to close
//   closed     — fully extended, touching = death
//   retracting — pulling back, harmless again
//
// Per design correction (2026-05-14): the death-line is no longer a
// descending bar. The hazard is timed radial squeezes you have to
// fall past during their open phase.
export default class PeristalsisCrusher {
  constructor(scene, y, tubeLeft, tubeRight, {
    thickness = 36,
    color = 0xd02040,
    edgeColor = 0xff6080,
    period = 2400,           // ms full cycle
    closedDuration = 600,    // ms held closed (deadly)
    telegraphDuration = 500, // ms warning flash before close
    phaseOffset = 0,         // ms into cycle at start (stagger)
  } = {}) {
    this.scene = scene;
    this.y = y;
    this.tubeLeft = tubeLeft;
    this.tubeRight = tubeRight;
    this.tubeMid = (tubeLeft + tubeRight) / 2;
    this.maxReach = (tubeRight - tubeLeft) / 2; // each side reaches the middle
    this.thickness = thickness;
    this.color = color;
    this.edgeColor = edgeColor;
    this.period = period;
    this.closedDuration = closedDuration;
    this.telegraphDuration = telegraphDuration;
    this.t = phaseOffset;
    this.alive = true;
    this.phase = 'idle';

    // Left crusher block — anchored at left wall, extends right.
    this.leftBlock = scene.add.rectangle(tubeLeft, y, 2, thickness, color);
    this.leftBlock.setOrigin(0, 0.5);
    this.leftBlock.setStrokeStyle(2, edgeColor);
    scene.physics.add.existing(this.leftBlock, true);
    this.leftBlock.crusher = this;

    // Right crusher block — anchored at right wall, extends left.
    this.rightBlock = scene.add.rectangle(tubeRight, y, 2, thickness, color);
    this.rightBlock.setOrigin(1, 0.5);
    this.rightBlock.setStrokeStyle(2, edgeColor);
    scene.physics.add.existing(this.rightBlock, true);
    this.rightBlock.crusher = this;

    this.update(0);
  }

  // Returns extension in pixels (0 = retracted, maxReach = touching middle)
  // and current phase name. Cycle (period long):
  //   [0, openTime)              → idle (retracted)
  //   [openTime, openTime+tele)  → telegraph (flashing, extending)
  //   [openTime+tele, closedEnd) → closed (fully extended, deadly)
  //   [closedEnd, period)        → retracting (pulling back)
  cyclePosition() {
    const t = this.t % this.period;
    const closedStart = this.period - this.closedDuration - (this.period * 0.15);
    const telegraphStart = closedStart - this.telegraphDuration;
    const closedEnd = closedStart + this.closedDuration;
    const retractDur = this.period - closedEnd;

    if (t < telegraphStart) {
      return { phase: 'idle', extension: 0 };
    }
    if (t < closedStart) {
      // Telegraph: extending from 0 → maxReach, flashing
      const k = (t - telegraphStart) / this.telegraphDuration;
      return { phase: 'telegraph', extension: this.maxReach * k };
    }
    if (t < closedEnd) {
      return { phase: 'closed', extension: this.maxReach };
    }
    // Retracting: from maxReach → 0
    const k = 1 - (t - closedEnd) / retractDur;
    return { phase: 'retracting', extension: this.maxReach * Math.max(0, k) };
  }

  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    const { phase, extension } = this.cyclePosition();
    this.phase = phase;

    const w = Math.max(2, extension);

    // Resize left block — grows right from its left edge.
    this.leftBlock.setSize(w, this.thickness);
    this.leftBlock.body.setSize(w, this.thickness);
    // Static body needs position refresh after resize. Origin (0, 0.5)
    // means leftBlock.x is its left edge — body center should be left+w/2.
    this.leftBlock.body.position.set(this.tubeLeft, this.y - this.thickness / 2);
    this.leftBlock.body.updateFromGameObject();

    this.rightBlock.setSize(w, this.thickness);
    this.rightBlock.body.setSize(w, this.thickness);
    this.rightBlock.body.position.set(this.tubeRight - w, this.y - this.thickness / 2);
    this.rightBlock.body.updateFromGameObject();

    // Telegraph flash — alternate alpha.
    if (phase === 'telegraph') {
      const flash = Math.floor(this.t / 80) % 2 === 0;
      this.leftBlock.setFillStyle(flash ? 0xffe040 : this.color);
      this.rightBlock.setFillStyle(flash ? 0xffe040 : this.color);
    } else if (phase === 'closed') {
      this.leftBlock.setFillStyle(0xff2030);
      this.rightBlock.setFillStyle(0xff2030);
    } else {
      this.leftBlock.setFillStyle(this.color);
      this.rightBlock.setFillStyle(this.color);
    }
  }

  // Is touching the block lethal right now? Only during the closed
  // phase. Telegraph/retracting are just pushes (handled by collider).
  isDeadly() {
    return this.phase === 'closed';
  }

  destroy() {
    this.alive = false;
    this.leftBlock.destroy();
    this.rightBlock.destroy();
  }
}
