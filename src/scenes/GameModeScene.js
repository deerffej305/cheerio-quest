import Phaser from 'phaser';
import { scoreManager } from '../systems/ScoreManager.js';

// Game Mode orchestrator. Doesn't render anything itself — it
// resets run state, launches the HUD overlay, and hands control to
// the first room scene. Future room transitions will route through
// here so we can sequence: room → end-of-room quiz → next room.
export default class GameModeScene extends Phaser.Scene {
  constructor() {
    super('GameMode');
  }

  create() {
    scoreManager.resetRun();
    this.scene.launch('Hud', { roomLabel: 'Room 1 — Mouth' });
    this.scene.start('RoomMouth');
  }
}
