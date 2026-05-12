import Phaser from 'phaser';

// C. difficile blob mini-boss (per design §6.5 "Mini-boss"). A
// goopy purple-red mass that splits into smaller blobs when
// stomped — Mario-style. Three size tiers:
//
//   big    → on stomp: split into 2 medium blobs, +5 pts
//   medium → on stomp: split into 2 small  blobs, +10 pts
//   small  → on stomp: destroyed, +20 pts
//
// All sizes hop occasionally. Side contact damages the player
// just like any other enemy.
const SIZES = {
  big:    { w: 70, h: 50, speed: 60,  points: 5,  color: 0x803050 },
  medium: { w: 46, h: 34, speed: 90,  points: 10, color: 0xa04060 },
  small:  { w: 26, h: 22, speed: 130, points: 20, color: 0xc05070 },
};

export default class CDiffBlob {
  constructor(scene, x, y, { size = 'big' } = {}) {
    this.scene = scene;
    this.size = size;
    this.alive = true;
    this.lastHopAt = scene.time.now + Phaser.Math.Between(400, 1400);

    const d = SIZES[size];
    this.sprite = scene.add.rectangle(x, y, d.w, d.h, d.color);
    this.sprite.setStrokeStyle(2, 0x401830);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setBounce(0.0, 0.0);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setVelocityX((Math.random() < 0.5 ? -1 : 1) * d.speed);
    this.sprite.cdiffBlob = this;
    this.speed = d.speed;
  }

  topY() {
    return this.sprite.y - this.sprite.height / 2;
  }

  pointsValue() {
    return SIZES[this.size].points;
  }

  // Smaller-size key for the splits, or null if this is the
  // smallest tier.
  nextSize() {
    if (this.size === 'big') return 'medium';
    if (this.size === 'medium') return 'small';
    return null;
  }

  update() {
    if (!this.alive) return;
    const b = this.sprite.body;
    const now = this.scene.time.now;

    // Bounce off walls / other solids.
    if (b.blocked.left) b.setVelocityX(this.speed);
    if (b.blocked.right) b.setVelocityX(-this.speed);

    // Periodic hop — adds vertical menace and lets blobs reach the
    // mid ledges in the colon.
    if (b.blocked.down && now >= this.lastHopAt) {
      b.setVelocityY(-Phaser.Math.Between(280, 360));
      this.lastHopAt = now + Phaser.Math.Between(900, 1800);
    }
  }

  // Returns { spawnSize, x, y } if this size splits into smaller
  // children, or null if it was the smallest tier (fully killed).
  squash() {
    if (!this.alive) return null;
    this.alive = false;
    this.sprite.body.enable = false;
    const x = this.sprite.x;
    const y = this.sprite.y;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.15,
      alpha: 0,
      duration: 200,
      onComplete: () => this.sprite.destroy(),
    });
    const next = this.nextSize();
    return next ? { spawnSize: next, x, y } : null;
  }
}
