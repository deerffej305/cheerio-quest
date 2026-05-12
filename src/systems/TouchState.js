// Shared singleton holding the state of the on-screen touch D-pad
// (see HudScene.spawnTouchPad). InputManager checks this alongside
// the keyboard so the cheerio responds to both inputs.

class TouchState {
  constructor() {
    this.left = false;
    this.right = false;
    this.jump = false;
    this.jumpJustPressed = false;
  }

  setLeft(down) { this.left = down; }
  setRight(down) { this.right = down; }

  setJump(down) {
    if (down && !this.jump) this.jumpJustPressed = true;
    this.jump = down;
  }

  // One-shot consumer matching Phaser's Keyboard.JustDown semantics.
  consumeJumpPress() {
    const v = this.jumpJustPressed;
    this.jumpJustPressed = false;
    return v;
  }

  // Called when a room shuts down / pauses so a "stuck button" can't
  // bleed into the next scene.
  reset() {
    this.left = false;
    this.right = false;
    this.jump = false;
    this.jumpJustPressed = false;
  }
}

export const touchState = new TouchState();
