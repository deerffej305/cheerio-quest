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
// Random angle range from the straight-left direction. Per CJ:
// negative angles tilt DOWN, positive tilt UP. -20°…+30°.
const PROJECTILE_ANGLE_MIN_DEG = -20;
const PROJECTILE_ANGLE_MAX_DEG = 30;
// Despawn-x: projectiles stay alive until they pass the spawn ledge
// on the far left of the room. (The room scene sets this; we default
// to off-screen left as a safety.)
const DEFAULT_DESPAWN_X = -80;

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

  // Spawn a straight-flying acid ball aimed broadly leftward at
  // random angle (-20° up … +30° down from straight-left).
  spit(cheerio) {
    if (!cheerio || !cheerio.alive) return;
    const startX = this.x - 60;
    const startY = this.y - 30;

    const angleDeg = Phaser.Math.Between(PROJECTILE_ANGLE_MIN_DEG, PROJECTILE_ANGLE_MAX_DEG);
    const rad = Phaser.Math.DegToRad(angleDeg);
    const vx = -PROJECTILE_SPEED * Math.cos(rad);
    // Flip sin so negative angles aim DOWN (positive y in screen coords).
    const vy = -PROJECTILE_SPEED * Math.sin(rad);

    const sprite = this.scene.add.image(startX, startY, 'acid-ball');
    this.scene.physics.add.existing(sprite);
    sprite.body.setAllowGravity(false);
    sprite.body.setSize(64, 56);
    sprite.body.setOffset(13, 17);
    sprite.body.setVelocity(vx, vy);

    const proj = { sprite };
    this.projectiles.push(proj);

    // Damage on contact with Crispy.
    this.scene.physics.add.overlap(cheerio.sprite, sprite, () => {
      if (!sprite.scene) return;
      this.destroyProjectile(proj);
      this.scene.applyHitToCheerio?.();
    });
  }

  updateProjectiles() {
    const despawnX = this.despawnX ?? DEFAULT_DESPAWN_X;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const s = p.sprite;
      if (!s?.scene) {
        this.destroyProjectile(p);
        continue;
      }
      // Despawn only once the projectile has cleared the spawn ledge
      // on the left (or wandered off screen vertically).
      if (s.x < despawnX || s.y < -120 || s.y > 1400) {
        this.destroyProjectile(p);
      }
    }
  }

  // The room calls this to anchor projectile despawn-x to the spawn
  // platform (so they live until they fly past it).
  setDespawnX(x) {
    this.despawnX = x;
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
