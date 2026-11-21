/** Estatísticas salvas no navegador. */
import { store } from './storage.js';
import { daysBetween } from './daily.js';

const DEFAULTS = {
  daily: { played: 0, wins: 0, streak: 0, best: 0, last: null, lastWon: false, dist: {} },
  free: { played: 0, wins: 0, points: 0, streak: 0, best: 0 },
};

export function loadStats() {
  const saved = store.get('stats', {});
  return {
    daily: { ...DEFAULTS.daily, ...saved.daily, dist: { ...saved.daily?.dist } },
    free: { ...DEFAULTS.free, ...saved.free },
  };
}

export const saveStats = (stats) => store.set('stats', stats);

export function recordDaily(stats, key, round) {
  const d = stats.daily;
  if (d.last === key) return; // já contou hoje
  const won = round.status === 'won';
  d.played++;
  if (won) {
    d.wins++;
    d.streak = d.last && d.lastWon && daysBetween(d.last, key) === 1 ? d.streak + 1 : 1;
    d.best = Math.max(d.best, d.streak);
  } else {
    d.streak = 0;
  }
  const bucket = won ? String(Math.min(round.shown, 6)) : 'x';
  d.dist[bucket] = (d.dist[bucket] || 0) + 1;
  Object.assign(d, { last: key, lastWon: won });
}

export function recordFree(stats, round, points) {
  const f = stats.free;
  f.played++;
  if (round.status === 'won') {
    f.wins++;
    f.points += points;
    f.streak++;
    f.best = Math.max(f.best, f.streak);
  } else {
    f.streak = 0;
  }
}
