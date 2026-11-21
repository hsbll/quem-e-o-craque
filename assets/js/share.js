/** Texto de compartilhamento no estilo dos jogos diários (quadradinhos coloridos). */
import { CONFIG } from './config.js';

const SQUARE = { hit: '🟩', miss: '🟥', skip: '⬛' };

export const shareGrid = (round, total) =>
  Array.from({ length: total }, (_, i) => SQUARE[round.history[i]?.type] || '⬜').join('');

export function shareText({ round, total, result, mode, day, hard }) {
  const url = location.origin + location.pathname;
  const level = hard ? ' · difícil' : '';
  const head = mode === 'daily' ? `⚽ ${CONFIG.title} #${day}${level}` : `⚽ ${CONFIG.title} · treino${level}`;
  return `${head}\n${shareGrid(round, total)}\n${result.emoji} ${result.points} pts\n${url}`;
}

/** Usa o menu nativo no celular e a área de transferência no computador. */
export async function share(text) {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'aborted';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
