import FiberToken from '../entities/FiberToken.js';
import { scoreManager } from './ScoreManager.js';
import { sound } from './SoundManager.js';

// Local-only debug/cheat state. This is a static single-player site
// with no server or multiplayer, so every cheat only ever affects
// the browser it is typed in — "only me" is automatic. State lives
// outside any scene (like ScoreManager) so a cheat toggled in one
// room stays on in the next, and is intentionally NOT cleared by
// resetRun() — cheats outlive a play-through.

class CheatManager {
  constructor() {
    this.unlocked = false;   // password entered this browser session
    this.debug = false;      // /fly       — physics hitbox overlay
    this.flight = false;     // /fall      — free flight, gravity off
    this.invincible = false; // /titlecard — ignore all damage / death
    this.autoAce = false;    // /qr        — end-of-room quizzes auto-perfect
  }

  // Runs a slash command. Returns a short confirmation string for
  // the console to flash, or null for an unknown command (the
  // console resumes the game silently on null).
  run(raw, scene) {
    const cmd = String(raw || '').trim().toLowerCase();
    switch (cmd) {
      case '/fly':
        this.debug = !this.debug;
        return `debug overlay ${this.debug ? 'ON' : 'OFF'}`;
      case '/fall':
        this.flight = !this.flight;
        return `flight ${this.flight ? 'ON' : 'OFF'}`;
      case '/titlecard':
        this.invincible = !this.invincible;
        return `invincible ${this.invincible ? 'ON' : 'OFF'}`;
      case '/qr':
        this.autoAce = !this.autoAce;
        return `auto-ace quizzes ${this.autoAce ? 'ON' : 'OFF'}`;
      case '/shroom':
        return this.spawnFiber(scene) ? 'fiber spawned' : null;
      default:
        return null;
    }
  }

  // Drops a real, collectible fiber token ~140px in front of Crispy
  // in whatever room is active. Wires its own overlap so it behaves
  // like a normal pickup (grow if small, +10 if big) without the
  // room needing to know about it.
  spawnFiber(scene) {
    const c = scene && scene.cheerio;
    if (!c || !c.alive) return false;
    const dir = c.body && c.body.velocity.x < 0 ? -1 : 1;
    const token = new FiberToken(scene, c.x + dir * 140, c.y - 10);
    const ov = scene.physics.add.overlap(c.sprite, token.sprite, () => {
      if (token.collected) return;
      token.collect();
      scoreManager.addFiber();
      sound.play('fiber');
      if (c.state === 'small') {
        c.grow();
        if (typeof scene.hud === 'function') scene.hud()?.setSize('big');
      } else {
        scoreManager.addPoints(10);
      }
      scene.physics.world.removeCollider(ov);
    });
    return true;
  }
}

export const cheatManager = new CheatManager();
