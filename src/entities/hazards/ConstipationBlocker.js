import Phaser from 'phaser';

// Constipation blocker — a pile of stool that partially blocks a
// path in the anus maze. No damage on contact; just a displacement
// obstacle. Some are static (climb over), some can be pushed
// horizontally a short distance.
//
// Grey-box visual: dark brown rounded blob (rectangle for now).
export default class ConstipationBlocker {
  constructor(scene, x, y, { pushable = false, color = 0x6a3818, w = 40, h = 40 } = {}) {
    this.scene = scene;
    this.pushable = pushable;

    this.sprite = scene.add.rectangle(x, y, w, h, color);
    this.sprite.setStrokeStyle(2, 0x4a2010);
    scene.physics.add.existing(this.sprite, !pushable);
    if (pushable) {
      this.sprite.body.setAllowGravity(true);
      this.sprite.body.setCollideWorldBounds(true);
      this.sprite.body.setDrag(800, 0);
    }
    this.sprite.constipationBlocker = this;
  }
}
