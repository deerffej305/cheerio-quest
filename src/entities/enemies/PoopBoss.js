import Phaser from 'phaser';

// Poop Boss — the lazy final obstacle in the Anus room. Sits on
// the exit tile. Stomping him 3 times makes him grudgingly roll
// off; he doesn't die. Once he's relocated, Crispy can stand on
// the now-unblocked exit tile and wait for the next fart.
//
// Grey-box visual: a large dark-brown blob with droopy half-closed
// eyes (he's lazy). On each stomp he flashes lighter brown and
// grumbles. On the third stomp he rolls off-screen-left and stops
// at a "grumpy spot" off the exit tile.

const STATES = {
  PLANTED: 'planted',
  ROLLING: 'rolling',
  GRUMPY: 'grumpy',
};

export default class PoopBoss {
  constructor(scene, x, y, { maxHp = 3 } = {}) {
    this.scene = scene;
    this.alive = true;
    this.state = STATES.PLANTED;
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.startX = x;
    this.startY = y;

    // Body: SVG sprite. Eyes are baked into the artwork, so no
    // separate eye game objects are needed.
    this.sprite = scene.add.image(x, y, 'poop-boss');
    this.sprite.setDisplaySize(110, 80);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(true);
    this.sprite.body.setImmovable(true);   // platform-like, doesn't slide on stomp
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setSize(110, 80);
    this.sprite.poopBoss = this;

    this.hpText = scene.add.text(x, y - 60, this.hpLabel(), {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtle "breathing".
    scene.tweens.add({
      targets: this.sprite,
      scaleY: 1.04,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  hpLabel() {
    const hp = Math.max(0, this.hp);
    return `POOP BOSS ${'☆'.repeat(hp)}${'·'.repeat(this.maxHp - hp)} — stomp ${hp}× more`;
  }

  topY() {
    return this.sprite.y - this.sprite.height / 2;
  }

  isRelocated() {
    return this.state === STATES.GRUMPY;
  }

  syncEyes() {
    // Eyes are baked into the SVG; just keep the HP label pinned.
    this.hpText.x = this.sprite.x;
    this.hpText.y = this.sprite.y - 60;
  }

  takeStomp() {
    if (this.state !== STATES.PLANTED) return false;
    this.hp -= 1;
    this.hpText.setText(this.hpLabel());

    // Tint slightly lighter on each hit (he's losing composure).
    const tints = [0xffffff, 0xffe0c8, 0xffc890];
    this.sprite.setTint(tints[Math.max(0, Math.min(2, this.maxHp - this.hp))]);

    // Lazy bounce reaction so the player feels the impact.
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.18,
      duration: 90,
      yoyo: true,
      ease: 'Quadratic.Out',
    });

    if (this.hp <= 0) {
      this.rollOff();
      return true;
    }
    return false;
  }

  rollOff() {
    // Swap to the rolled-off SVG once he's deciding to move.
    this.sprite.setTexture('poop-boss-rolled-off');
    this.sprite.setDisplaySize(110, 80);
    this.sprite.clearTint();
    // He grudgingly rolls left, exposing the exit tile. He doesn't
    // die — just clears off.
    this.state = STATES.ROLLING;
    this.hpText.setText('Fine. I\'m moving…');
    this.scene.tweens.killTweensOf(this.sprite);

    const grumpyX = this.startX - 300;
    this.scene.tweens.add({
      targets: this.sprite,
      x: grumpyX,
      angle: -160,
      duration: 1100,
      ease: 'Cubic.Out',
      onUpdate: () => this.syncEyes(),
      onComplete: () => {
        this.state = STATES.GRUMPY;
        this.hpText.setText('grumpy');
        this.hpText.setColor('#aaaaaa');
        this.syncEyes();
      },
    });
  }
}
