/**
 * Regras de uma rodada, sem nada de interface.
 * round.history[i] guarda o que aconteceu com o escudo i: 'hit', 'miss' ou 'skip'.
 */
import { CONFIG } from './config.js';
import { norm } from './text.js';

export const newRound = () => ({ shown: 1, history: [], status: 'playing' });

export function isCorrect(player, text, id) {
  if (id) return id === player.id;
  const n = norm(text);
  return !!n && [player.name, ...player.names].some((name) => norm(name) === n);
}

/** action: { type: 'guess', text, id? } | { type: 'skip' } */
export function play(round, player, total, action) {
  if (round.status !== 'playing') return round;

  if (action.type === 'guess' && isCorrect(player, action.text, action.id)) {
    round.history.push({ type: 'hit', text: action.text });
    round.status = 'won';
    return round;
  }

  round.history.push(action.type === 'skip' ? { type: 'skip' } : { type: 'miss', text: action.text });
  if (round.shown >= total) round.status = 'lost';
  else round.shown++;
  return round;
}

/** Pontuação simples: cada escudo a menos vale mais pontos. */
export const pointsFor = (shown, total) => Math.max(1, total - shown + 1) * CONFIG.pointsPerCrest;

/** Resumo do resultado da rodada para a tela e para o compartilhamento. */
export function outcome(round, total) {
  if (round.status === 'lost') {
    return { won: false, points: 0, title: 'FIM DA CARREIRA', sprite: 'flag', color: '#ff4f8b', emoji: '🚩', line: 'A carreira acabou sem acerto.' };
  }
  const points = pointsFor(round.shown, total);
  const first = round.shown === 1;
  return {
    won: round.status === 'won',
    points,
    title: first ? 'DE PRIMEIRA!' : 'ACERTOU!',
    sprite: first ? 'trophy' : 'ball',
    color: first ? '#ffd166' : '#4de1ff',
    emoji: first ? '🏆' : '⚽',
    line: first ? 'Reconheceu pelo primeiro escudo.' : `Precisou de ${round.shown} escudos.`,
  };
}
