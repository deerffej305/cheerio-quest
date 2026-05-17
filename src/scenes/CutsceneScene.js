import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import { leaderboardClient, promptForName } from '../systems/LeaderboardClient.js';

// Five named cut scenes per STORY.md. Panel counts + one-line
// beat captions are mirrored here so reviewers can see story
// intent in the grey-box without opening STORY.md. Real artwork
// drops into public/assets/cutscenes/ in the Phase 7 art pass —
// the placeholder boxes go away then.
//
// UX: one panel at a time. Click / SPACE / ENTER advances. After
// the last panel the scene either transitions to nextScene or
// resumes the paused scene (whichever was passed in).

// Panel captions/dialogue are no longer rendered (art carries the
// scene). Only the array LENGTH matters now — it drives how many
// cutscene-<key>-N images play. Counts per Cowork 2nd art cut:
//   liftoff 4 · tongue 3 · blob 3 · poop 3 · splashdown 5  (= 18).
const SCENES = {
  liftoff:    { label: 'Lift Off',    panels: [{}, {}, {}, {}] },
  tongue:     { label: 'The Tongue',  panels: [{}, {}, {}] },
  blob:       { label: 'ACID',        panels: [{}, {}, {}] },
  poop:       { label: 'Poop Boss',   panels: [{}, {}, {}] },
  splashdown: { label: 'Splashdown',  panels: [{}, {}, {}, {}, {}] },
};

export default class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('Cutscene');
  }

  init(data = {}) {
    this.key = data.key || 'liftoff';
    this.nextScene = data.nextScene || null;
    this.resumeSceneKey = data.resumeSceneKey || null;
    // When true (used by the splashdown ending), the last panel's
    // advance triggers the leaderboard submit prompt before
    // routing to nextScene.
    this.submitOnAdvance = !!data.submitOnAdvance;
    this._advanced = false;
    this.idx = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#08070a');
    this.spec = SCENES[this.key] || { label: this.key, panels: [{ caption: 'placeholder' }] };

    const cx = GAME_WIDTH / 2;

    // Panel image, aspect preserved (native 800x380 → ×1.6). The
    // artwork carries the scene now — no scaffolding header / label
    // / caption / dialogue text.
    this.panelImage = this.add.image(cx, GAME_HEIGHT / 2, 'cutscene-liftoff-1');
    this.panelImage.setScale(1.6);

    // The only text that survives is the splashdown ending's score
    // recap (functional, not a grey-box leftover).
    this.endRecap = this.add.text(cx, GAME_HEIGHT - 130, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#ffffff',
      fontStyle: 'bold', align: 'center', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false);

    this.add.text(cx, GAME_HEIGHT - 28, 'Click / SPACE to advance · ESC to skip', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#888888',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => this.nextPanel());
    this.input.keyboard.on('keydown-ENTER', () => this.nextPanel());
    this.input.on('pointerdown', () => this.nextPanel());
    this.input.keyboard.on('keydown-ESC', () => this.advance());

    this.renderPanel();
  }

  renderPanel() {
    // Map cutscene key + panel index → asset key (cutscene-<key>-N).
    const panelKey = `cutscene-${this.key}-${this.idx + 1}`;
    if (this.scene.systems.cache.obj?.exists?.(panelKey) || this.textures.exists(panelKey)) {
      this.panelImage.setTexture(panelKey);
      this.panelImage.setScale(1.6);
    }
    // Only the splashdown ending's final panel shows text — the
    // live score recap + leaderboard prompt.
    if (this.key === 'splashdown' && this.idx === this.spec.panels.length - 1) {
      this.endRecap.setText(
        `THE END.\n` +
        `Final Score: ${scoreManager.points}\n` +
        `Questions Correct: ${scoreManager.questionsCorrect}\n` +
        `Fiber Tokens: ${scoreManager.fiberCount} / 6\n\n` +
        `Click / SPACE to enter your name and submit →`,
      ).setVisible(true);
    } else {
      this.endRecap.setVisible(false);
    }
  }

  nextPanel() {
    if (this._advanced) return;
    this.idx += 1;
    if (this.idx >= this.spec.panels.length) {
      this.advance();
    } else {
      this.renderPanel();
    }
  }

  async advance() {
    if (this._advanced) return;
    this._advanced = true;
    if (this.submitOnAdvance) {
      await this.submitFinalScores();
    }
    if (this.resumeSceneKey) {
      this.scene.resume(this.resumeSceneKey);
      this.scene.stop();
    } else if (this.nextScene) {
      this.scene.start(this.nextScene);
    } else {
      this.scene.start('Title');
    }
  }

  async submitFinalScores() {
    const name = promptForName('PLAYER');
    if (!name) return;
    // Game Mode posts to both points + correct boards.
    await leaderboardClient.submit('points', name, scoreManager.points);
    await leaderboardClient.submit('correct', name, scoreManager.questionsCorrect);
  }
}
