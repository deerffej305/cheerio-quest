import Phaser from 'phaser';

// Fiber-brick wall — a solid wall that ONLY Big Cheerio can break
// through. Small Cheerio bounces off. Hides secret rooms with
// bonus points and the room's fiber token per the design doc.
//
// Mechanics in the room:
//   - Register a `physics.add.collider` with a processCallback that
//     returns true only when the cheerio is Small. So Big passes
//     through, Small is blocked.
//   - Register a `physics.add.overlap` that, when the cheerio is
//     Big, calls `wall.breakOpen()` to destroy the wall.
export default class FiberBrickWall {
  constructor(scene, x, y, w = 30, h = 80, { color = 0xb8966a } = {}) {
    this.scene = scene;
    this.alive = true;

    this.sprite = scene.add.image(x, y, 'fiber-brick-wall');
    this.sprite.setDisplaySize(w, h);
    scene.physics.add.existing(this.sprite, true);
    this.sprite.body.setSize(w, h);
    this.sprite.fiberBrickWall = this;
  }

  breakOpen() {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.body.enable = false;
    // Tiny shatter — scale down + fade.
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      angle: 30,
      duration: 250,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
