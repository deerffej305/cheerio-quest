// Shared run state, kept outside any Phaser scene so it survives
// scene transitions and room restarts. A single Game Mode run reuses
// one instance; resetRun() is called from GameModeScene when the
// orchestrator starts a fresh play-through.

class ScoreManager {
  constructor() {
    this.resetRun();
    // Cross-run best — survives resetRun() so the Title leaderboard
    // can show the player's best Quiz Mode streak across sessions.
    this.bestQuizStreak = 0;
  }

  resetRun() {
    this.points = 0;
    this.fiberCount = 0;
    this.questionsCorrect = 0;
    this.roomIndex = 0;
  }

  recordQuizStreak(streak) {
    if (streak > this.bestQuizStreak) this.bestQuizStreak = streak;
  }

  addPoints(n) {
    this.points = Math.max(0, this.points + n);
  }

  payDeathPenalty() {
    this.addPoints(-20);
  }

  addFiber() {
    this.fiberCount += 1;
  }

  addQuestionCorrect() {
    this.questionsCorrect += 1;
  }
}

export const scoreManager = new ScoreManager();
