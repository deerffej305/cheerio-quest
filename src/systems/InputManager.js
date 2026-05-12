import Phaser from 'phaser';
import { touchState } from './TouchState.js';

// Centralises keyboard + on-screen touch input. Scenes ask
// isLeftDown() / isRightDown() / wasJumpJustPressed() instead of
// poking individual keys, so the Surface-tablet D-pad and a USB
// keyboard work interchangeably from the cheerio's perspective.

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
    return this.cursors.left.isDown || this.keyA.isDown || touchState.left;
  }

  isRightDown() {
    return this.cursors.right.isDown || this.keyD.isDown || touchState.right;
  }

  isJumpDown() {
    return this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown || touchState.jump;
  }

  wasJumpJustPressed() {
    // Eagerly consume the touch press regardless of keyboard state
    // so a stale "just pressed" flag can't bleed into the next
    // frame and cause a phantom double-jump.
    const kb =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keyW) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace);
    const touch = touchState.consumeJumpPress();
    return kb || touch;
  }
}
