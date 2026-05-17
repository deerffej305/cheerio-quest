import Phaser from 'phaser';

// Poop Boss — the lazy final obstacle in the Anus room. He blocks
// the exit on the right. Per CJ: you have to CONTINUALLY stomp him
// to push him left. Each stomp shoves him further left; if you stop
// stomping he lazily rolls back toward the exit on the right. Push
// him far enough left and he gives up (relocated) — the exit clears.

const STOMP_PUSH = 95;        // px shoved left per stomp
const DRIFT_BACK = 70;        // px/s he rolls back right when idle
const RELOCATE_PUSH = 360;    // accumulated left-push that clears the exit
const MAX_PUSH = 420;         // hard cap so he can't be flung past
const ROLL_SPIN = 1.6;        // sprite rotation (rad) per full RELOCATE_PUSH

export default class PoopBoss {
  constructor(scene, x, y, { maxHp = 3 } = {}) {
    this.scene = scene;
    this.alive = true;
    this.startX = x;
    this.startY = y;
    this.pushX = 0;             // 0 = at start (blocking), grows leftward
    this.relocated = false;

    // Body: SVG sprite. Sized big like the Acid Blob so the final
    // obstacle reads as substantial.
    this.sprite = scene.add.image(x, y, 'poop-boss');
    this.sprite.setDisplaySize(220, 180);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    // The poop-boss texture is rasterized at 110x80 and the sprite
    // is scaled up to 220x180 (×2.0, ×2.25). Arcade body.setSize is
    // in TEXTURE space and then scaled by the sprite, so to get a
    // ~140x112 world hitbox we set 70x50 in texture space. Offsets
    // are texture-space too, centering on the poop mass.
    this.sprite.body.setSize(70, 50);
    this.sprite.body.setOffset(20, 20);
    this.sprite.poopBoss = this;

    this.hpText = scene.add.text(x, y - 110, 'POOP BOSS — keep stomping!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  topY() {
    return this.sprite.y - this.sprite.displayHeight / 2;
  }

  isRelocated() {
    return this.relocated;
  }

  // Called by RoomAnus on a from-above stomp. Shoves him left.
  takeStomp() {
    if (this.relocated) return true;
    this.pushX = Math.min(MAX_PUSH, this.pushX + STOMP_PUSH);
    this._lastStompAt = this.scene.time.now;

    // Squash reaction so the hit reads.
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 1.12,
      duration: 80,
      yoyo: true,
      ease: 'Quadratic.Out',
    });

    if (this.pushX >= RELOCATE_PUSH) {
      this.relocated = true;
      this.hpText.setText('Fiiine. Go.').setColor('#aaaaaa');
      return true;
    }
    return false;
  }

  update(_delta) {
    if (!this.alive) return;
    const dt = this.scene.game.loop.delta / 1000;

    if (!this.relocated) {
      // Lazy roll-back to the right whenever he's not being stomped.
      this.pushX = Math.max(0, this.pushX - DRIFT_BACK * dt);
    }

    // Position + rolling spin from accumulated push. Dynamic body
    // auto-syncs to the sprite each frame — no updateFromGameObject
    // (that's a static-body call and was resetting body size).
    this.sprite.x = this.startX - this.pushX;
    this.sprite.setRotation(-(this.pushX / RELOCATE_PUSH) * ROLL_SPIN);

    this.hpText.x = this.sprite.x;
    this.hpText.y = this.startY - 110;
  }
}
