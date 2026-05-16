import Phaser from 'phaser';

// Stomach Acid Blob boss — reworked per CJ:
//   * No more open/close mouth cycle. Always stompable from above.
//   * Periodically spits a straight-line acid projectile toward Crispy.
//   * Stomping triggers a brief roar (visual swap) and knocks Crispy
//     all the way back to the start of the room — but the boss takes
//     a damage tick for it. 3 HP.
//
// States:
//   idle           — just bobbing, stompable
//   spitting       — one-shot spit, still stompable (brief)
//   roar_reaction  — just took a stomp, invulnerable for a moment,
//                    plays the roaring texture
//   defeated       — exit unlocked, deflated

const STATES = {
  IDLE: 'idle',
  SPITTING: 'spitting',
  ROAR_REACTION: 'roar_reaction',
  DEFEATED: 'defeated',
};

const DURATIONS = {
  idle: 2400,           // time between spits while bobbing
  spitting: 280,        // brief mouth-open spit animation
  roar_reaction: 900,   // stomp-recovery (invulnerable)
};

const PROJECTILE_SPEED = 520;
const PROJECTILE_LIFE_MS = 4000;

export default class StomachAcidBlob {
  constructor(scene, x, y, { maxHp = 3 } = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.state = STATES.IDLE;
    this.stateStartedAt = scene.time.now;

    // Body sprite. Texture swaps to the roaring variant during a
    // spit windup and the stomp recovery.
    this.body = scene.add.image(x, y, 'stomach-acid-blob');
    this.body.setDisplaySize(140, 170);
    this.body.setAllowGravity?.(false);
    scene.physics.add.existing(this.body);
    this.body.body.setAllowGravity(false);
    this.body.body.setImmovable(true);
    this.body.body.setSize(120, 150);
    this.body.body.setOffset(10, 10);
    this.body.stomachAcidBlob = this;

    // Idle bob.
    this.bobTween = scene.tweens.add({
      targets: this.body,
      scaleY: this.body.scaleY * 1.06,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.hpText = scene.add.text(x, y - 110, this.hpLabel(), {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Boss-fired acid projectiles, tracked so the room can iterate
    // them for cleanup if needed. Each entry: { sprite }.
    this.projectiles = [];

    // Owning scene wires this — invoked when the boss is stomped so
    // the scene can knock Crispy back and play the stomp SFX.
    this.onStomped = null;
  }

  hpLabel() {
    const hp = Math.max(0, this.hp);
    return `ACID BLOB ${'♥'.repeat(hp)}${'·'.repeat(this.maxHp - hp)}`;
  }

  setTextureFor(state) {
    const wantsRoar = state === STATES.SPITTING || state === STATES.ROAR_REACTION;
    const key = wantsRoar ? 'stomach-acid-blob-roaring' : 'stomach-acid-blob';
    if (this.body.texture && this.body.texture.key !== key) {
      this.body.setTexture(key);
      this.body.setDisplaySize(140, 170);
    }
  }

  get bodySprite() {
    return this.body;
  }

  // Old API kept so RoomStomach's existing call site doesn't crash;
  // the mouth-only hitbox is gone now — whole body is stompable.
  get mouthSprite() {
    return this.body;
  }

  isStompable() {
    return this.state === STATES.IDLE || this.state === STATES.SPITTING;
  }

  isDefeated() {
    return this.state === STATES.DEFEATED;
  }

  advance(to) {
    this.state = to;
    this.stateStartedAt = this.scene.time.now;
    this.setTextureFor(to);
  }

  update(cheerio) {
    if (this.state === STATES.DEFEATED) {
      this.updateProjectiles();
      return;
    }
    const elapsed = this.scene.time.now - this.stateStartedAt;

    switch (this.state) {
      case STATES.IDLE: {
        if (elapsed >= DURATIONS.idle) {
          this.advance(STATES.SPITTING);
          this.spit(cheerio);
        }
        break;
      }
      case STATES.SPITTING: {
        if (elapsed >= DURATIONS.spitting) this.advance(STATES.IDLE);
        break;
      }
      case STATES.ROAR_REACTION: {
        if (elapsed >= DURATIONS.roar_reaction) this.advance(STATES.IDLE);
        break;
      }
      default: break;
    }

    this.updateProjectiles();
  }

  // Spawn a straight-flying acid ball aimed at Crispy. Uses the
  // existing acid-ball SVG.
  spit(cheerio) {
    if (!cheerio || !cheerio.alive) return;
    const direction = cheerio.x < this.x ? -1 : 1;
    const startX = this.x + direction * 60;
    const startY = this.y - 30;

    const sprite = this.scene.add.image(startX, startY, 'acid-ball');
    this.scene.physics.add.existing(sprite);
    sprite.body.setAllowGravity(false);
    sprite.body.setSize(60, 54);
    sprite.body.setVelocityX(direction * PROJECTILE_SPEED);

    const proj = { sprite, expiresAt: this.scene.time.now + PROJECTILE_LIFE_MS };
    this.projectiles.push(proj);

    // Damage on contact with Crispy.
    this.scene.physics.add.overlap(cheerio.sprite, sprite, () => {
      if (!sprite.scene) return;
      this.destroyProjectile(proj);
      this.scene.applyHitToCheerio?.();
    });
  }

  updateProjectiles() {
    const now = this.scene.time.now;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.sprite?.scene || now >= p.expiresAt) {
        this.destroyProjectile(p);
      }
    }
  }

  destroyProjectile(p) {
    if (p.sprite?.scene) p.sprite.destroy();
    const idx = this.projectiles.indexOf(p);
    if (idx >= 0) this.projectiles.splice(idx, 1);
  }

  // Returns 'defeated' | 'stomped' | 'ignored'. The scene handles the
  // knockback; we only manage state + HP here.
  takeStomp() {
    if (!this.isStompable()) return 'ignored';
    this.hp -= 1;
    this.hpText.setText(this.hpLabel());
    const tints = [0xffffff, 0xd0a0a0, 0xa07070];
    this.body.setTint(tints[Math.max(0, Math.min(2, this.maxHp - this.hp - 1))]);

    if (this.hp <= 0) {
      this.defeat();
      return 'defeated';
    }
    this.advance(STATES.ROAR_REACTION);
    return 'stomped';
  }

  defeat() {
    this.state = STATES.DEFEATED;
    this.hpText.setText('PYLORUS OPEN!');
    this.hpText.setColor('#90ff90');
    this.scene.tweens.killTweensOf(this.body);
    this.scene.tweens.add({
      targets: [this.body],
      alpha: 0,
      scaleX: this.body.scaleX * 0.4,
      scaleY: this.body.scaleY * 0.4,
      duration: 700,
      onComplete: () => {
        if (this.body.scene) this.body.destroy();
      },
    });
  }
}
