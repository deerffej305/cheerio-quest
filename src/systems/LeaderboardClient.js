// Talks to the Cloudflare Worker that backs the leaderboards
// (see GAME_DESIGN.md §8 + worker/leaderboard.js).
//
// Three boards (matching the Worker's keys):
//   points  — Game Mode Most Points
//   correct — Game Mode Most Questions Correct
//   streak  — Quiz Mode Highest Streak

const ENDPOINT = 'https://cheerio-quest-leaderboard.jeff-a23.workers.dev/';

export const BOARDS = ['points', 'correct', 'streak'];

export const BOARD_LABEL = {
  points: 'Most Points',
  correct: 'Most Questions Correct',
  streak: 'Quiz Mode Streak',
};

class LeaderboardClient {
  async fetchBoard(board) {
    try {
      const res = await fetch(`${ENDPOINT}?board=${encodeURIComponent(board)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.entries) ? data.entries : [];
    } catch {
      return [];
    }
  }

  async fetchAll() {
    const results = await Promise.all(BOARDS.map(b => this.fetchBoard(b)));
    return { points: results[0], correct: results[1], streak: results[2] };
  }

  async submit(board, name, score) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, name, score }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

export const leaderboardClient = new LeaderboardClient();

// Convenience UI helper. Synchronous prompt for simplicity in the
// grey-box; real text-input UI lands in the polish pass.
export function promptForName(defaultName = 'PLAYER') {
  // eslint-disable-next-line no-alert
  const raw = window.prompt('Enter your name (15 char max):', defaultName);
  if (raw == null) return null;
  const cleaned = String(raw).slice(0, 15).trim() || 'PLAYER';
  return cleaned;
}
