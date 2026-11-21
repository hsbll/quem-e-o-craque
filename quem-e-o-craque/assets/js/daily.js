/** Utilidades do "Craque do dia": o mesmo jogador para todo mundo na mesma data. */
import { CONFIG } from './config.js';

const pad = (n) => String(n).padStart(2, '0');
const toUTC = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);

export const dayNumber = (key = dateKey()) => Math.max(1, daysBetween(CONFIG.launchDate, key) + 1);

/** Hash FNV-1a: transforma a data em um número estável. */
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function msToMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

export function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
