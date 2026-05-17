import Phaser from 'phaser';

// Acid ball — Mario podoboo. Sits in the acid pool at the bottom,
// then on a cycle bubbles up (telegraph), launches upward, peaks,
// and falls back. Not stompable; any contact damages. The bubble
// telegraph is what gives the player a chance to dodge.
//
// Grey-box visual: orange ball (rectangle for now).

const PHASES = {
  IDLE: 'idle',
  TELEGRAPH: 'telegraph',
  RISING: 'rising',
  FALLING: 'falling',
};

const DURATIONS = {
  idle: 2200,
  telegraph: 500,
  rising: 700,   // travels up to peakHeight
  falling: 700,  // travels back down to acid level
};

export default class AcidBall {
  constructor(scene, x, acidTopY, { peakHeight = 220, phaseOffset = 0 } = {}) {
    this.scene = scene;
    this.x = x;
    this.acidTopY = acidTopY;
    this.peakHeight = peakHeight;

    this.sprite = scene.add.image(x, acidTopY + 20, 'acid-ball');
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setImmovable(true);
    // Body fits the visible orange orb inside the squished 90x90
    // raster of the 140x160 native SVG. Ball center in raster sits
    // at (~43.7, ~43.9); ellipse axes ~32×28. Explicit setOffset
    // because dynamic-body auto-center math is off when the SVG
    // isn't centered in its bbox.
    this.sprite.body.setSize(64, 56);
    // Rising-from-pit acid balls overrode their offset every frame
    // via body.reset() — which moves the body to gameObject CENTER
    // ignoring offset. That kept the hitbox centered on the SVG bbox
    // rather than the visible ball. Below: removed reset() calls in
    // update(), and shifted offset further to land on the ball that
    // sits up + left in the non-aspect-preserved raster.
    this.sprite.body.setOffset(5, 14);
    this.sprite.acidBall = this;
    this.sprite.setVisible(false);

    // Telegraph bubble — a smaller dim sprite that puffs at the
    // surface before the ball erupts.
    this.bubble = scene.add.image(x, acidTopY - 6, 'acid-ball');
    this.bubble.setDisplaySize(54, 36);
    this.bubble.setAlpha(0);

    this.phase = PHASES.IDLE;
    this.phaseStartedAt = scene.time.now - phaseOffset;
  }

  advancePhase() {
    const order = [PHASES.IDLE, PHASES.TELEGRAPH, PHASES.RISING, PHASES.FALLING];
    const next = order[(order.indexOf(this.phase) + 1) % order.length];
    this.phase = next;
    this.phaseStartedAt = this.scene.time.now;
  }

  update() {
    const now = this.scene.time.now;
    const elapsed = now - this.phaseStartedAt;
    const dur = DURATIONS[this.phase];

    switch (this.phase) {
      case PHASES.IDLE: {
        this.sprite.setVisible(false);
        this.sprite.body.enable = false;
        this.bubble.setAlpha(0);
        break;
      }
      case PHASES.TELEGRAPH: {
        // Bubble pulses at the surface — your warning.
        const t = elapsed / dur;
        this.bubble.setAlpha(0.4 + 0.4 * Math.sin(now / 60));
        this.bubble.scaleX = 1 + 0.4 * t;
        this.bubble.scaleY = 1 + 0.2 * t;
        this.sprite.setVisible(false);
        break;
      }
      case PHASES.RISING: {
        this.bubble.setAlpha(0);
        this.sprite.setVisible(true);
        this.sprite.body.enable = true;
        const t = Phaser.Math.Easing.Quadratic.Out(elapsed / dur);
        this.sprite.y = this.acidTopY - t * this.peakHeight;
        // Body auto-syncs to sprite via preUpdate (using setOffset).
        break;
      }
      case PHASES.FALLING: {
        const t = Phaser.Math.Easing.Quadratic.In(elapsed / dur);
        this.sprite.y = (this.acidTopY - this.peakHeight) + t * this.peakHeight;
        if (this.sprite.y >= this.acidTopY) {
          this.sprite.setVisible(false);
          this.sprite.body.enable = false;
        }
        break;
      }
      default: break;
    }

    if (elapsed >= dur) this.advancePhase();
  }

  isDangerous() {
    return this.phase === PHASES.RISING || this.phase === PHASES.FALLING;
  }
}
