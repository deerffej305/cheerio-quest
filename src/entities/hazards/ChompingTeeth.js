import Phaser from 'phaser';

// Pair of upper + lower teeth that periodically clamp shut. The
// danger zone is the strip between them. Damage only fires during
// the 'closed' phase; on open/transition, the player can walk under.
//
// Cycle: open (idle) → telegraph (yellow tint) → closed (clamp) →
// opening (retract) → loops.

const PHASES = {
  open: { duration: 1700, color: 0xeeeeee },
  telegraph: { duration: 600, color: 0xffcc00 },
  closed: { duration: 500, color: 0xff4040 },
  opening: { duration: 400, color: 0xeeeeee },
};

export default class ChompingTeeth {
  constructor(scene, x, floorY, ceilingY, { width = 60, phaseOffset = 0 } = {}) {
    this.scene = scene;
    this.x = x;
    this.floorY = floorY;
    this.ceilingY = ceilingY;
    this.width = width;

    const toothHeight = 60;
    this.upperOpenY = ceilingY + toothHeight / 2;
    this.upperClosedY = (floorY + ceilingY) / 2 - 4;
    this.lowerOpenY = floorY - toothHeight / 2;
    this.lowerClosedY = (floorY + ceilingY) / 2 + 4;

    this.upper = scene.add.image(x, this.upperOpenY, 'chomping-tooth-upper');
    this.upper.setDisplaySize(width, toothHeight);
    this.lower = scene.add.image(x, this.lowerOpenY, 'chomping-tooth-lower');
    this.lower.setDisplaySize(width, toothHeight);

    // phaseOffset shifts this tooth's cycle so a row of teeth can
    // stagger — the player gets timing windows instead of one
    // synchronized wall of teeth.
    this.phase = 'open';
    this.phaseStartedAt = scene.time.now - phaseOffset;
  }

  isClosed() {
    return this.phase === 'closed';
  }

  containsPlayer(cheerio) {
    const px = cheerio.x;
    const py = cheerio.y;
    const inX = Math.abs(px - this.x) < this.width / 2 + cheerio.sprite.width / 2 - 4;
    const inY = py > this.ceilingY && py < this.floorY;
    return inX && inY;
  }

  update() {
    const now = this.scene.time.now;
    const phase = PHASES[this.phase];
    const t = (now - this.phaseStartedAt) / phase.duration;

    let progress; // 0 = fully open, 1 = fully closed
    if (this.phase === 'open') {
      progress = 0;
    } else if (this.phase === 'telegraph') {
      progress = Phaser.Math.Easing.Quadratic.In(t) * 0.15;
    } else if (this.phase === 'closed') {
      progress = 1;
    } else {
      progress = 1 - Phaser.Math.Easing.Quadratic.Out(t);
    }

    this.upper.y = Phaser.Math.Linear(this.upperOpenY, this.upperClosedY, progress);
    this.lower.y = Phaser.Math.Linear(this.lowerOpenY, this.lowerClosedY, progress);
    // Tint the SVG sprites per phase. White (0xffffff) = no tint.
    const tint = this.phase === 'open' ? 0xffffff : phase.color;
    this.upper.setTint(tint);
    this.lower.setTint(tint);

    if (t >= 1) this.advancePhase();
  }

  advancePhase() {
    const order = ['open', 'telegraph', 'closed', 'opening'];
    const next = order[(order.indexOf(this.phase) + 1) % order.length];
    this.phase = next;
    this.phaseStartedAt = this.scene.time.now;
  }
}
