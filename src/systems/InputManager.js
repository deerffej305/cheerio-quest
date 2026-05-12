import Phaser from 'phaser';

// Centralises keyboard + (later) on-screen touch input. Scenes ask
// isLeftDown() / isRightDown() / wasJumpJustPressed() instead of
// poking individual keys, so we can swap in touch buttons later
// without rewriting Cheerio.js.

export default class InputManager {
  constructor(scene) {
    this.scene = scene;

    const kb = scene.input.keyboard;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  isLeftDown() {
    return this.cursors.left.isDown || this.keyA.isDown;
  }

  isRightDown() {
    return this.cursors.right.isDown || this.keyD.isDown;
  }

  isJumpDown() {
    return this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown;
  }

  wasJumpJustPressed() {
    return (
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keyW) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    );
  }
}
