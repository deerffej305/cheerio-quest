import Phaser from 'phaser';

// Stomach Acid Blob boss (per STORY.md / BUILD_STATUS.md):
// Hulk-rage personality. Sits in front of the pyloric exit. Has a
// big jagged mouth full of acid teeth that opens when he roars.
//
// Cycle:
//   idle (1.6s, closed-mouth, motionless) → wind-up (0.5s, mouth
//   starts opening) → roar (1.1s, mouth wide open, vulnerable to
//   stomp) → close (0.4s, mouth slams shut) → idle...
//
// HP = 3. Each stomp during the roar drops 1 HP. After the third
// stomp he deflates, the door behind him is exposed.
//
// Grey-box visual: a big purple-red ellipse for the body. The
// "mouth" is a row of triangular acid teeth (Graphics polygons)
// that animate between closed and open. Boss tints darker on each
// successive stomp.

const STATES = {
  IDLE: 'idle',
  WINDUP: 'windup',
  ROAR: 'roar',
  CLOSE: 'close',
  DEFEATED: 'defeated',
};

const DURATIONS = {
  idle: 1600,
  windup: 500,
  roar: 1100,
  close: 400,
};

export default class StomachAcidBlob {
  constructor(scene, x, y, { maxHp = 3 } = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.state = STATES.IDLE;
    this.stateStartedAt = scene.time.now;

    // Body: oblong purple-red blob.
    this.body = scene.add.ellipse(x, y, 140, 170, 0xff5028);
    this.body.setStrokeStyle(3, 0x802010);
    // Idle bob.
    scene.tweens.add({
      targets: this.body,
      scaleY: 1.06,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Eyes — angry stripes above the mouth.
    this.eyeL = scene.add.rectangle(x - 24, y - 36, 12, 4, 0x401010);
    this.eyeR = scene.add.rectangle(x + 24, y - 36, 12, 4, 0x401010);

    // Mouth — a stomp-friendly hitbox + visible jagged-teeth row.
    // The hitbox spans the top of the body when the mouth is open;
    // stomping the hitbox is what damages the boss.
    this.mouthHit = scene.add.rectangle(x, y - 50, 100, 24, 0x000000, 0);
    scene.physics.add.existing(this.mouthHit);
    this.mouthHit.body.setAllowGravity(false);
    this.mouthHit.body.setImmovable(true);
    this.mouthHit.stomachAcidBlob = this;
    this.mouthHit.body.enable = false;

    // Teeth row — a Graphics object that we re-draw on each state
    // tick to animate the mouth opening.
    this.teeth = scene.add.graphics();
    this.openness = 0; // 0 = closed, 1 = wide open
    this.redrawTeeth();

    this.hpText = scene.add.text(x, y - 110, this.hpLabel(), {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  hpLabel() {
    const hp = Math.max(0, this.hp);
    return `ACID BLOB ${'♥'.repeat(hp)}${'·'.repeat(this.maxHp - hp)}`;
  }

  redrawTeeth() {
    const g = this.teeth;
    g.clear();
    // Mouth slot — only visible during windup/roar.
    if (this.openness <= 0) return;
    const opening = this.openness;
    const slotW = 100;
    const slotCx = this.x;
    const slotCy = this.y - 50;
    const slotH = 40 * opening;
    // Dark mouth interior.
    g.fillStyle(0x300810, 1);
    g.fillRect(slotCx - slotW / 2, slotCy - slotH / 2, slotW, slotH);
    // Upper teeth (downward triangles).
    g.fillStyle(0xfff0c0, 1);
    const toothW = 12;
    const toothCount = 7;
    for (let i = 0; i < toothCount; i++) {
      const tx = slotCx - slotW / 2 + 4 + i * (toothW + 2);
      const tipY = slotCy - slotH / 2 + 10 * opening + 8;
      g.beginPath();
      g.moveTo(tx, slotCy - slotH / 2);
      g.lineTo(tx + toothW, slotCy - slotH / 2);
      g.lineTo(tx + toothW / 2, tipY);
      g.closePath();
      g.fillPath();
    }
    // Lower teeth.
    for (let i = 0; i < toothCount; i++) {
      const tx = slotCx - slotW / 2 + 4 + i * (toothW + 2);
      const tipY = slotCy + slotH / 2 - 10 * opening - 8;
      g.beginPath();
      g.moveTo(tx, slotCy + slotH / 2);
      g.lineTo(tx + toothW, slotCy + slotH / 2);
      g.lineTo(tx + toothW / 2, tipY);
      g.closePath();
      g.fillPath();
    }
  }

  // Hitbox the player overlaps with — wraps the body + mouth.
  get mouthSprite() {
    return this.mouthHit;
  }

  get bodySprite() {
    return this.body;
  }

  isRoaring() {
    return this.state === STATES.ROAR;
  }

  isDefeated() {
    return this.state === STATES.DEFEATED;
  }

  advance(to) {
    this.state = to;
    this.stateStartedAt = this.scene.time.now;
  }

  update() {
    if (this.state === STATES.DEFEATED) return;
    const elapsed = this.scene.time.now - this.stateStartedAt;
    const dur = DURATIONS[this.state];

    switch (this.state) {
      case STATES.IDLE: {
        this.openness = 0;
        this.mouthHit.body.enable = false;
        if (elapsed >= dur) this.advance(STATES.WINDUP);
        break;
      }
      case STATES.WINDUP: {
        const t = Phaser.Math.Easing.Quadratic.In(elapsed / dur);
        this.openness = t * 0.6;
        if (elapsed >= dur) this.advance(STATES.ROAR);
        break;
      }
      case STATES.ROAR: {
        // Wide open + slight pulse. Mouth is now stompable.
        const t = elapsed / dur;
        this.openness = 0.85 + 0.15 * Math.sin(t * 16);
        this.mouthHit.body.enable = true;
        if (elapsed >= dur) this.advance(STATES.CLOSE);
        break;
      }
      case STATES.CLOSE: {
        const t = Phaser.Math.Easing.Quadratic.Out(elapsed / dur);
        this.openness = Math.max(0, 1 - t);
        this.mouthHit.body.enable = false;
        if (elapsed >= dur) this.advance(STATES.IDLE);
        break;
      }
      default: break;
    }

    this.redrawTeeth();
  }

  takeStomp() {
    if (this.state !== STATES.ROAR) return false;
    this.hp -= 1;
    this.hpText.setText(this.hpLabel());
    // Tint the body redder/darker as he weakens.
    const tints = [0xff5028, 0xc04020, 0x803010];
    this.body.fillColor = tints[Math.max(0, Math.min(2, this.maxHp - this.hp - 1))];
    if (this.hp <= 0) {
      this.defeat();
      return true;
    }
    // Slam the mouth shut immediately as feedback.
    this.advance(STATES.CLOSE);
    return false;
  }

  defeat() {
    this.state = STATES.DEFEATED;
    this.mouthHit.body.enable = false;
    this.hpText.setText('PYLORUS OPEN!');
    this.hpText.setColor('#90ff90');
    this.scene.tweens.killTweensOf(this.body);
    this.scene.tweens.add({
      targets: [this.body, this.eyeL, this.eyeR, this.teeth],
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 700,
      onComplete: () => {
        this.body.destroy();
        this.eyeL.destroy();
        this.eyeR.destroy();
        this.teeth.destroy();
      },
    });
  }
}
