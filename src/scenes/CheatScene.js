import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { cheatManager } from '../systems/CheatManager.js';

// Always-on overlay launched once at boot. Watches for the typed
// trigger "+cheats" anywhere in the game; when seen it pauses every
// other running scene and shows a styled in-game console. First a
// password gate (73917391), then a slash-command line. Unknown
// command or a cancelled / wrong password resumes the game
// silently. Pure client-side — see CheatManager.
//
// It also continuously mirrors cheatManager.debug onto whatever
// room's physics world is live, so /fly (hitbox overlay) survives
// room transitions and scene restarts without the rooms knowing.

const PASSWORD = '73917391';
const ACCENT = '#ffcf73';

export default class CheatScene extends Phaser.Scene {
  constructor() {
    // active:true so Phaser boots it as an always-on parallel scene
    // from frame 1 (it is last in the scene list, so it renders on
    // top). Launching it from BootScene instead dropped it out of
    // the per-frame step loop, because Boot shuts itself down in the
    // same tick it would launch this.
    super({ key: 'Cheat', active: true });
  }

  create() {
    this.open = false;
    this.phase = 'password';   // 'password' | 'command'
    this.buf = '';             // rolling trigger-detection buffer
    this.entry = '';           // current line being typed
    this.pausedKeys = [];
    this.caretOn = true;

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78);
    this.panel = this.add.rectangle(cx, cy, 620, 240, 0x140a1e, 0.98)
      .setStrokeStyle(3, 0xffcf73, 0.9);

    this.titleText = this.add.text(cx, cy - 90, '▓ CHEAT CONSOLE ▓', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px',
      color: ACCENT, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.promptText = this.add.text(cx, cy - 40, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#e0c8ff',
    }).setOrigin(0.5);

    this.entryText = this.add.text(cx, cy + 6, '', {
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '26px',
      color: '#ffffff', backgroundColor: '#241433', padding: { x: 16, y: 8 },
    }).setOrigin(0.5);

    this.hintText = this.add.text(cx, cy + 78, 'Enter ⏎ to submit  ·  Esc to cancel', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#8877aa',
    }).setOrigin(0.5);

    this.ui = [this.dim, this.panel, this.titleText, this.promptText, this.entryText, this.hintText];
    this.ui.forEach(o => o.setVisible(false).setDepth(9999));

    this.input.keyboard.on('keydown', e => this.onKey(e));

    // Caret blink.
    this.time.addEvent({
      delay: 450, loop: true,
      callback: () => { this.caretOn = !this.caretOn; if (this.open) this.renderEntry(); },
    });
  }

  // --- Trigger + input -------------------------------------------

  onKey(e) {
    if (!this.open) {
      if (e.key && e.key.length === 1) {
        this.buf = (this.buf + e.key).slice(-12);
        if (this.buf.toLowerCase().endsWith('+cheats')) {
          this.buf = '';
          this.openConsole();
        }
      }
      return;
    }

    if (e.key === 'Escape') { this.closeAndResume(); return; }

    if (e.key === 'Enter') { this.submit(); return; }

    if (e.key === 'Backspace') {
      this.entry = this.entry.slice(0, -1);
      this.renderEntry();
      return;
    }

    if (e.key && e.key.length === 1) {
      this.entry += e.key;
      this.renderEntry();
    }
  }

  submit() {
    const value = this.entry;

    if (this.phase === 'password') {
      if (value === PASSWORD) {
        cheatManager.unlocked = true;
        this.phase = 'command';
        this.entry = '';
        this.refreshPrompt();
        this.renderEntry();
      } else {
        this.closeAndResume(); // wrong password → silent
      }
      return;
    }

    // command phase
    if (!value.trim()) { this.closeAndResume(); return; }
    const result = cheatManager.run(value, this.gameScene());
    if (!result) { this.closeAndResume(); return; } // unknown → silent

    // Known command: flash confirmation briefly, then resume so the
    // effect (flight, etc.) takes hold in the unpaused game.
    this.entry = '';
    this.promptText.setText(result).setColor('#80ff80');
    this.entryText.setVisible(false);
    this.hintText.setVisible(false);
    this.time.delayedCall(900, () => this.closeAndResume());
  }

  // --- Open / close ----------------------------------------------

  openConsole() {
    this.open = true;
    this.entry = '';
    this.phase = cheatManager.unlocked ? 'command' : 'password';

    this.pausedKeys = [];
    this.scene.manager.scenes.forEach(s => {
      const key = s.sys.settings.key;
      if (key === 'Cheat') return;
      if (s.sys.isActive()) { this.scene.pause(key); this.pausedKeys.push(key); }
    });

    this.scene.bringToTop();
    this.ui.forEach(o => o.setVisible(true));
    this.entryText.setVisible(true);
    this.hintText.setVisible(true);
    this.refreshPrompt();
    this.renderEntry();
  }

  closeAndResume() {
    this.open = false;
    this.entry = '';
    this.buf = '';
    this.ui.forEach(o => o.setVisible(false));
    this.pausedKeys.forEach(k => this.scene.resume(k));
    this.pausedKeys = [];
  }

  refreshPrompt() {
    this.promptText.setColor('#e0c8ff');
    this.promptText.setText(this.phase === 'password'
      ? 'ENTER PASSWORD'
      : 'ENTER COMMAND  ( /fly  /fall  /qr  /titlecard  /shroom )');
  }

  renderEntry() {
    const shown = this.phase === 'password'
      ? '•'.repeat(this.entry.length)
      : this.entry;
    this.entryText.setText(shown + (this.caretOn ? '_' : ' '));
  }

  // --- Helpers ---------------------------------------------------

  // The paused room scene that owns Crispy (for /shroom). null when
  // the console was opened somewhere with no room (e.g. Title).
  gameScene() {
    for (const k of this.pausedKeys) {
      const s = this.scene.manager.getScene(k);
      if (s && s.cheerio) return s;
    }
    return null;
  }

  update() {
    // Keep the physics-debug overlay in sync with /fly on whatever
    // room is currently live. Skips while the console is open (rooms
    // are paused then) — it re-applies on resume.
    if (this.open) return;
    for (const s of this.scene.manager.scenes) {
      if (s.sys.settings.key === 'Cheat') continue;
      if (!s.sys.isActive()) continue;
      const world = s.physics && s.physics.world;
      if (!world || !s.cheerio) continue;
      if (cheatManager.debug) {
        world.drawDebug = true;
        if (!world.debugGraphic) world.createDebugGraphic();
        world.debugGraphic.setVisible(true);
      } else if (world.debugGraphic) {
        world.drawDebug = false;
        world.debugGraphic.clear();
        world.debugGraphic.setVisible(false);
      }
    }
  }
}
