import questionsData from '../data/questions.json';

// Pull strategy per GAME_DESIGN.md §7:
//   1. First fill from the matching `room` tag.
//   2. If short, fall back to `room == "general"`.
//   3. If still short, fall back to any unused.
//   4. No repeats within a single run (Game Mode round).
//
// The "no repeats in a round" rule is enforced via a per-run
// "used" set. resetRun() is called from GameModeScene at the start
// of a fresh play-through.

class QuestionBank {
  constructor() {
    this.all = questionsData.questions.slice();
    this.usedIds = new Set();
  }

  resetRun() {
    this.usedIds.clear();
  }

  unused(predicate) {
    return this.all.filter(q => !this.usedIds.has(q.id) && (!predicate || predicate(q)));
  }

  // Returns `count` questions for the given room tag. May return
  // fewer than `count` if the entire bank is exhausted (won't repeat
  // within the run regardless).
  drawForRoom(roomTag, count) {
    const picked = [];

    const take = (pool) => {
      while (picked.length < count && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const q = pool.splice(idx, 1)[0];
        this.usedIds.add(q.id);
        picked.push(q);
      }
    };

    take(this.unused(q => q.room === roomTag));
    if (picked.length < count) take(this.unused(q => q.room === 'general'));
    if (picked.length < count) take(this.unused());

    return picked;
  }

  // Quiz Mode: random draw from the full pool, no room filter.
  drawAny(count) {
    const picked = [];
    const pool = this.unused();
    while (picked.length < count && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      const q = pool.splice(idx, 1)[0];
      this.usedIds.add(q.id);
      picked.push(q);
    }
    return picked;
  }

  totalCount() {
    return this.all.length;
  }
}

export const questionBank = new QuestionBank();
