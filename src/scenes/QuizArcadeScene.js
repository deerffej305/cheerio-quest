import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { questionBank } from '../systems/QuestionBank.js';
import { scoreManager } from '../systems/ScoreManager.js';
import { sound } from '../systems/SoundManager.js';
import { leaderboardClient, promptForName } from '../systems/LeaderboardClient.js';

// Quiz Mode (Phase 6 per design doc §5): sudden-death streak.
// Draws random questions from the full bank. Right answer →
// streak++ and another question. First wrong answer → game over,
// best-streak recorded, return to Title.
//
// No platforming, no HUD overlay. Pure assessment.

const FEEDBACK_MS = 800;

export default class QuizArcadeScene extends Phaser.Scene {
  constructor() {
    super('QuizArcade');
  }

  create() {
    this.cameras.main.setBackgroundColor('#10081c');
    this.streak = 0;
    this.answered = false;
    this.gameOver = false;
    // Reset return guard — Phaser reuses scene instances, so a true
    // value from a previous run would block returning to Title.
    this._returning = false;
    questionBank.resetRun(); // start with a fresh no-repeat pool

    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 50, 'Quiz Mode — sudden death', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.streakText = this.add.text(cx, 90, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#80ff80', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.bestText = this.add.text(cx, 118, `Best streak ever: ${scoreManager.bestQuizStreak}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.questionText = this.add.text(cx, 220, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', color: '#ffffff',
      wordWrap: { width: GAME_WIDTH - 160 }, align: 'center',
    }).setOrigin(0.5);

    this.optionTexts = [];
    for (let i = 0; i < 4; i++) {
      const t = this.add.text(cx, 360 + i * 60, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: '#e8e8ff',
        backgroundColor: '#2a1830', padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.choose(i));
      this.optionTexts.push(t);
    }

    this.feedbackText = this.add.text(cx, GAME_HEIGHT - 100, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffcf73', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT - 30, 'Press 1–4 to answer · Esc returns to Title', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#8899aa',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown', (e) => {
      if (this.gameOver) return;
      if (this.answered) return;
      const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3,
                    Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
      const i = map[e.code];
      if (i != null) this.choose(i);
    });

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Title'));

    this.drawAndRender();
  }

  refreshStreak() {
    this.streakText.setText(`Streak: ${this.streak}`);
  }

  drawAndRender() {
    this.refreshStreak();
    const drawn = questionBank.drawAny(1);
    if (drawn.length === 0) {
      // Bank fully exhausted — victory of sorts.
      this.endRun(true);
      return;
    }
    this.current = drawn[0];
    this.answered = false;
    this.questionText.setText(this.current.question);
    this.feedbackText.setText('');
    for (let i = 0; i < 4; i++) {
      this.optionTexts[i].setText(`[${i + 1}] ${this.current.options[i]}`);
      this.optionTexts[i].setStyle({ backgroundColor: '#2a1830', color: '#e8e8ff' });
      this.optionTexts[i].setVisible(true);
    }
  }

  choose(i) {
    if (this.answered || this.gameOver) return;
    this.answered = true;
    const correct = i === this.current.correctAnswerIndex;

    this.optionTexts[i].setStyle({ backgroundColor: correct ? '#206030' : '#702030', color: '#ffffff' });
    if (!correct) {
      this.optionTexts[this.current.correctAnswerIndex].setStyle({ backgroundColor: '#206030', color: '#ffffff' });
    }

    if (correct) {
      this.streak += 1;
      sound.play('score');
      this.feedbackText.setText('Correct!').setColor('#80ff80');
      this.time.delayedCall(FEEDBACK_MS, () => this.drawAndRender());
    } else {
      sound.play('damage');
      this.feedbackText.setText('Wrong — run over').setColor('#ff8080');
      this.time.delayedCall(FEEDBACK_MS + 200, () => this.endRun(false));
    }
  }

  endRun(banked) {
    this.gameOver = true;
    scoreManager.recordQuizStreak(this.streak);
    // Clear options and show summary.
    this.optionTexts.forEach(t => t.setVisible(false));
    this.questionText.setText(banked
      ? `You answered every question! Final streak: ${this.streak}`
      : `Run over. Streak: ${this.streak}`);
    this.questionText.setColor(banked ? '#80ff80' : '#ffcf73');
    this.bestText.setText(`Best streak ever: ${scoreManager.bestQuizStreak}`);
    this.feedbackText.setText('Submitting to leaderboard…');

    // Only submit non-zero streaks — a 0 entry is just noise on the
    // public leaderboard, especially with kids spamming play.
    if (this.streak > 0) {
      this.time.delayedCall(500, () => this.submitStreak());
    } else {
      this.feedbackText.setText('Press SPACE to return to Title');
    }

    const goBack = () => {
      if (this._returning) return;
      this._returning = true;
      this.scene.start('Title');
    };
    this.input.keyboard.once('keydown-SPACE', goBack);
    this.input.keyboard.once('keydown-ENTER', goBack);
    this.input.once('pointerdown', goBack);
    this.time.delayedCall(8000, goBack);
  }

  async submitStreak() {
    const name = promptForName('PLAYER');
    if (!name) {
      this.feedbackText.setText('Score not submitted. Press SPACE to return.');
      return;
    }
    const result = await leaderboardClient.submit('streak', name, this.streak);
    this.feedbackText.setText(result
      ? `Submitted as "${name}". Press SPACE to return.`
      : 'Submit failed (offline?). Press SPACE to return.');
  }
}
