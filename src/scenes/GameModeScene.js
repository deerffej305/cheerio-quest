import Phaser from 'phaser';
import { scoreManager } from '../systems/ScoreManager.js';
import { questionBank } from '../systems/QuestionBank.js';

// Game Mode orchestrator. Doesn't render anything itself — it
// resets run state (score AND question-no-repeat set), launches
// the HUD overlay, and hands control to the first room scene.
// Room → end-of-room quiz → next room is wired in each room's
// completeRoom().
export default class GameModeScene extends Phaser.Scene {
  constructor() {
    super('GameMode');
  }

  create() {
    scoreManager.resetRun();
    questionBank.resetRun();
    this.scene.launch('Hud', { roomLabel: 'Room 1 — Mouth' });
    // Lift Off cutscene plays before the mouth — kid eats Crispy,
    // "Oh no.", etc. Real panels arrive with the art pass.
    this.scene.start('Cutscene', { key: 'liftoff', nextScene: 'RoomMouth' });
  }
}
