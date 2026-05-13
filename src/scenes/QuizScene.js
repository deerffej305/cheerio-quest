import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { scoreManager } from '../systems/ScoreManager.js';
import { questionBank } from '../systems/QuestionBank.js';

// End-of-room quiz per GAME_DESIGN.md §7. Receives data:
//   { room: 'mouth' | 'esophagus' | ... | 'general',
//     nextScene: 'RoomEsophagus' | ... ,
//     count: 10 (default) }
// Draws `count` questions from QuestionBank for the room, shows
// them one at a time. Correct +10, wrong -5. Tracks
// scoreManager.questionsCorrect. On completion, transitions to
// `nextScene`. If `nextScene` is null/missing, returns to Title.

const POINTS_RIGHT = 10;
const POINTS_WRONG = -5;
const FEEDBACK_MS = 900;

export default class QuizScene extends Phaser.Scene {
  constructor() {
    super('Quiz');
  }

  init(data = {}) {
    this.roomTag = data.room || 'general';
    this.nextScene = data.nextScene || null;
    this.count = data.count || 10;
    // Optional cutscene key — if set, the post-quiz transition
    // routes through CutsceneScene(key) on the way to nextScene.
    // Only the Large Intestine quiz uses this (key='poop') under
    // the locked 5-cutscene plan.
    this.cutsceneKey = data.cutsceneKey || null;
    this.questions = [];
    this.idx = 0;
    this.answered = false;
    this.correctSoFar = 0;
    this.wrongSoFar = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a0a14');

    this.questions = questionBank.drawForRoom(this.roomTag, this.count);
    if (this.questions.length === 0) {
      // Bank totally exhausted — skip the quiz.
      this.advance();
      return;
    }

    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 50, `End-of-Room Quiz · ${this.roomLabel()}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.progressText = this.add.text(cx, 90, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.questionText = this.add.text(cx, 200, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', color: '#ffffff',
      wordWrap: { width: GAME_WIDTH - 160 }, align: 'center',
    }).setOrigin(0.5);

    this.optionTexts = [];
    for (let i = 0; i < 4; i++) {
      const t = this.add.text(cx, 340 + i * 60, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: '#e8e8ff',
        backgroundColor: '#2a1830', padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.choose(i));
      this.optionTexts.push(t);
    }

    this.feedbackText = this.add.text(cx, GAME_HEIGHT - 80, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT - 30, 'Press 1–4 to answer · clicks work too', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#8899aa',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown', (e) => {
      if (this.answered) return;
      const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3,
                    Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
      const i = map[e.code];
      if (i != null) this.choose(i);
    });

    this.renderCurrent();
  }

  roomLabel() {
    return ({
      mouth: 'Mouth', esophagus: 'Esophagus', stomach: 'Stomach',
      small_intestine: 'Small Intestine', large_intestine: 'Large Intestine',
      anus: 'Anus', general: 'General',
    })[this.roomTag] || this.roomTag;
  }

  renderCurrent() {
    this.answered = false;
    const q = this.questions[this.idx];
    this.progressText.setText(`Question ${this.idx + 1} of ${this.questions.length}`);
    this.questionText.setText(q.question);
    this.feedbackText.setText('');
    for (let i = 0; i < 4; i++) {
      this.optionTexts[i].setText(`[${i + 1}] ${q.options[i]}`);
      this.optionTexts[i].setStyle({ backgroundColor: '#2a1830', color: '#e8e8ff' });
    }
  }

  choose(i) {
    if (this.answered) return;
    this.answered = true;
    const q = this.questions[this.idx];
    const correct = i === q.correctAnswerIndex;

    // Mark chosen + correct visually.
    this.optionTexts[i].setStyle({ backgroundColor: correct ? '#206030' : '#702030', color: '#ffffff' });
    if (!correct) {
      this.optionTexts[q.correctAnswerIndex].setStyle({ backgroundColor: '#206030', color: '#ffffff' });
    }

    if (correct) {
      scoreManager.addPoints(POINTS_RIGHT);
      scoreManager.addQuestionCorrect();
      this.correctSoFar += 1;
      this.feedbackText.setText(`Correct! +${POINTS_RIGHT}`).setColor('#80ff80');
    } else {
      scoreManager.addPoints(POINTS_WRONG);
      this.wrongSoFar += 1;
      this.feedbackText.setText(`Wrong — ${POINTS_WRONG} pts`).setColor('#ff8080');
    }

    this.time.delayedCall(FEEDBACK_MS, () => this.nextQuestion());
  }

  nextQuestion() {
    this.idx += 1;
    if (this.idx >= this.questions.length) {
      this.showSummary();
    } else {
      this.renderCurrent();
    }
  }

  showSummary() {
    // Clear option texts so the summary is visually quieter.
    this.optionTexts.forEach(t => t.setVisible(false));
    this.questionText.setText(`Quiz complete: ${this.correctSoFar} / ${this.questions.length} correct`);
    this.questionText.setColor('#80ff80');
    this.progressText.setText(`Score now: ${scoreManager.points}`);
    this.feedbackText.setText(this.nextScene
      ? 'Press SPACE to continue →'
      : 'Press SPACE to return to Title');

    const advance = () => this.advance();
    this.input.keyboard.once('keydown-SPACE', advance);
    this.input.keyboard.once('keydown-ENTER', advance);
    // Click-to-advance fallback.
    this.input.once('pointerdown', advance);
    // Auto-advance after a few seconds if the player doesn't press.
    this.time.delayedCall(4500, advance);
  }

  advance() {
    if (this._advanced) return;
    this._advanced = true;
    if (!this.nextScene) {
      this.scene.stop('Hud');
      this.scene.start('Title');
      return;
    }
    if (this.cutsceneKey) {
      this.scene.start('Cutscene', { key: this.cutsceneKey, nextScene: this.nextScene });
    } else {
      this.scene.start(this.nextScene);
    }
  }
}
