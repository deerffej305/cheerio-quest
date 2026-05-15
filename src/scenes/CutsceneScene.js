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

const SCENES = {
  liftoff: {
    label: 'Cut Scene 1 — Lift Off',
    panels: [
      { caption: 'Spoon rising toward kid\'s mouth. Crispy on top, milk drops around.' },
      { caption: 'Close on Crispy\'s face — eyes huge, knees trembling.', dialogue: '"Oh no."' },
      { caption: 'POV from inside the mouth — Crispy tiny on the spoon, framed by two giant teeth.' },
      { caption: 'Spoon tilts. Crispy is flung off, arms windmilling.' },
      { caption: 'BLACKOUT. Title card.', dialogue: 'JOURNEY TO THE CENTER OF THE ANUS\nA Crispy Story' },
    ],
  },
  tongue: {
    label: 'Cut Scene 2 — The Tongue',
    panels: [
      { caption: 'Crispy walks cautiously past a row of teeth. Saliva drips.' },
      { caption: 'A LOW RUMBLE. Floor shakes. Crispy braces.' },
      { caption: 'Reveal: arched pink tongue at the back of the mouth, two googly eyes glaring.' },
      { caption: 'The Tongue speaks.', dialogue: '"WAIT— what... what ARE you?"\n"...doesn\'t matter. GET CRUSHED, SNACK."' },
      { caption: 'The Tongue lunges. Crispy crouches, ready to jump.' },
    ],
  },
  blob: {
    label: 'Cut Scene 3 — ACID',
    panels: [
      { caption: 'Crispy on a half-dissolved bread platform above the acid pit. He peers down.' },
      { caption: 'Bubbles churn in the acid.' },
      { caption: 'A MASSIVE acid blob erupts. Two red eyes, jagged acid-teeth mouth. Steam rising.' },
      { caption: 'Blob roars.', dialogue: '"RRRRAAAAAAAGH"' },
      { caption: 'Blob smashes the ground. Acid waves ripple outward.' },
    ],
  },
  poop: {
    label: 'Cut Scene 4 — The Poop Boss',
    panels: [
      { caption: 'Crispy stumbles into a wider chamber. Tired, sweat-dropped, eye-droopy. He\'s been through it.' },
      { caption: 'Turns a corner: massive lumpy turd sitting on the glowing exit tile, sleepy half-closed eyes.' },
      { caption: 'Poop Boss speaks. Slow, lazy.', dialogue: '"Ughhh. No rush, man. I\'ve been hangin out here for a WEEK."' },
      { caption: 'Crispy.', dialogue: '"...heck."' },
      { caption: 'Walls shake. A countdown fades in: FART IN 30 SECONDS. Crispy braces.' },
    ],
  },
  splashdown: {
    label: 'Cut Scene 5 — Splashdown',
    panels: [
      { caption: 'WHOOSH lines. The fart fires. Crispy launched.' },
      { caption: 'Behind Crispy. Open sky. Pixel-mosaic-censored kid\'s backside fading away.' },
      { caption: 'Front of Crispy now. Eyes closed, smiling. Triumph. Relief.' },
      { caption: 'Pull back. Crispy floats in toilet water with several pixel-mosaic-censored brown blobs.' },
      { caption: 'Crispy opens his eyes and looks at the blobs. No dialogue — his face does all the work.' },
      { caption: 'Title card: THE END + final score + name entry prompt.', dialogue: 'THE END.\nEnter your name for the leaderboard ↓' },
    ],
  },
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

    this.add.text(cx, 40, 'CUT SCENE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 75, this.spec.label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#e0c8ff', fontStyle: 'italic',
    }).setOrigin(0.5);

    // The big panel image that we re-fill per panel. Native size is
    // 800x380; we scale to 1.6 so it fills the 1280×720 viewport
    // nicely. The labeled "PANEL N" placeholder is gone.
    this.panelImage = this.add.image(cx, GAME_HEIGHT / 2 + 20, 'cutscene-liftoff-1');
    this.panelImage.setScale(1.6);

    // Hidden — kept so existing references to panelLabel don't crash.
    this.panelLabel = this.add.text(cx, GAME_HEIGHT / 2 - 90, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '40px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);

    this.panelCaption = this.add.text(cx, GAME_HEIGHT / 2, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#dddddd',
      wordWrap: { width: 720 }, align: 'center',
    }).setOrigin(0.5);

    this.panelDialogue = this.add.text(cx, GAME_HEIGHT / 2 + 80, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
      wordWrap: { width: 720 }, align: 'center',
    }).setOrigin(0.5);

    this.progressText = this.add.text(cx, GAME_HEIGHT - 60, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT - 30, 'Click / SPACE to advance · ESC to skip cutscene', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#666666',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => this.nextPanel());
    this.input.keyboard.on('keydown-ENTER', () => this.nextPanel());
    this.input.on('pointerdown', () => this.nextPanel());
    this.input.keyboard.on('keydown-ESC', () => this.advance());

    this.renderPanel();
  }

  renderPanel() {
    const p = this.spec.panels[this.idx];
    // Map cutscene key + panel index → asset key (cutscene-<key>-N).
    const panelKey = `cutscene-${this.key}-${this.idx + 1}`;
    if (this.scene.systems.cache.obj?.exists?.(panelKey) || this.textures.exists(panelKey)) {
      this.panelImage.setTexture(panelKey);
    }
    this.panelCaption.setText(p?.caption || '');
    // Splashdown panel 6 swaps its dialogue placeholder for the
    // live score recap (STORY.md panel 6 — THE END + final score
    // + name entry prompt).
    let dialogue = p?.dialogue || '';
    if (this.key === 'splashdown' && this.idx === this.spec.panels.length - 1) {
      dialogue =
        `THE END.\n` +
        `Final Score: ${scoreManager.points}\n` +
        `Questions Correct: ${scoreManager.questionsCorrect}\n` +
        `Fiber Tokens: ${scoreManager.fiberCount} / 6\n\n` +
        `Click / SPACE to enter your name and submit →`;
    }
    this.panelDialogue.setText(dialogue);
    this.progressText.setText(`${this.idx + 1} / ${this.spec.panels.length}`);
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
