/** Ponto de entrada: guarda o estado e liga a interface às regras do jogo. */
import { CONFIG } from './config.js';
import { store } from './storage.js';
import { norm } from './text.js';
import { loadData } from './data.js';
import { buildCareer } from './career.js';
import { resolveCrest } from './crests.js';
import { buildIndex, attachAutocomplete } from './autocomplete.js';
import { newRound, play, outcome } from './game.js';
import { dateKey, dayNumber, hash, msToMidnight, formatCountdown } from './daily.js';
import { shareText, share, copyText } from './share.js';
import { loadStats, saveStats, recordDaily, recordFree } from './stats.js';
import { stadiumScene, sceneWidth } from './scene.js';
import * as ui from './ui.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEFAULT_SETTINGS = { clubNames: false, pixel: true, youth: false, difficulty: 'facil' };

const S = {
  ready: null, // promessa da fonte de dados
  data: null,
  index: null,
  mode: 'daily',
  settings: { ...DEFAULT_SETTINGS, ...store.get('settings', {}) },
  stats: loadStats(),
  games: { daily: null, free: null },
  pending: { daily: null, free: null },
  game: null,
  view: null,
  nextFree: null,
  token: 0,
};

/* ---------- escolher jogadores ---------- */

const isPlayable = (p, youth) => p && p.name && buildCareer(p.spells, { youth }).length >= CONFIG.minClubs;
const difficulty = () => CONFIG.difficulties.find((d) => d.id === S.settings.difficulty) || CONFIG.difficulties[0];
const isHard = () => !difficulty().years;
const freeSignature = () => `${S.settings.difficulty}|${S.settings.youth}`;

async function pickDaily(key) {
  const pool = await S.data.pool(CONFIG.dailyMinSitelinks);
  if (!pool.length) throw new Error('Nenhum jogador disponível.');
  const start = hash(key) % pool.length;
  for (let i = 0; i < 25; i++) {
    const player = await S.data.player(pool[(start + i * 7919) % pool.length]);
    if (isPlayable(player, false)) return player;
  }
  throw new Error('Não encontrei o craque do dia.');
}

async function pickFree() {
  const pool = await S.data.pool(difficulty().min);
  if (!pool.length) throw new Error('Nenhum jogador disponível.');
  const recent = store.get('recent', []);
  for (let i = 0; i < 14; i++) {
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (i < 10 && recent.includes(id)) continue;
    const player = await S.data.player(id);
    if (isPlayable(player, S.settings.youth)) {
      store.set('recent', [id, ...recent].slice(0, 80));
      return player;
    }
  }
  throw new Error('Não encontrei um jogador com carreira completa.');
}

function prefetchFree() {
  const job = pickFree();
  job.catch(() => {});
  S.nextFree = { sig: freeSignature(), job };
}

/* ---------- montar rodadas ---------- */

async function makeGame(mode, player, round, key, hard = isHard()) {
  const career = buildCareer(player.spells, { youth: mode === 'free' && S.settings.youth });
  const game = { mode, key, player, career, round, hard, crests: career.map(() => undefined) };
  const jobs = career.map((club, i) =>
    resolveCrest(club).then((src) => {
      game.crests[i] = src;
      if (S.game === game) render();
    }),
  );
  await Promise.race([jobs[Math.min(round.shown, career.length) - 1], sleep(5000)]);
  return game;
}

const isFresh = (mode, g) => g && (mode === 'free' ? g.round.status === 'playing' : g.key === dateKey());

/** Carrega (ou reaproveita) a rodada de um modo. */
function loadGame(mode) {
  if (isFresh(mode, S.games[mode])) return Promise.resolve(S.games[mode]);
  if (S.pending[mode]) return S.pending[mode];

  const job = (async () => {
    await S.ready;
    let game;
    if (mode === 'daily') {
      const key = dateKey();
      const saved = store.get('daily');
      let player = saved?.key === key ? await S.data.player(saved.playerId) : null;
      let round = player ? saved.round : null;
      let hard = player ? saved.hard ?? isHard() : isHard();
      if (!player) {
        player = await pickDaily(key);
        round = newRound();
        store.set('daily', { key, playerId: player.id, round, hard });
      }
      game = await makeGame('daily', player, round, key, hard);
    } else {
      const pre = S.nextFree?.sig === freeSignature() ? await S.nextFree.job.catch(() => null) : null;
      S.nextFree = null;
      game = await makeGame('free', pre || (await pickFree()), newRound());
      prefetchFree();
    }
    S.games[mode] = game;
    return game;
  })().finally(() => {
    S.pending[mode] = null;
  });

  S.pending[mode] = job;
  return job;
}

function modeLabel(mode, hard = isHard()) {
  const level = hard ? 'DIFÍCIL' : 'FÁCIL';
  return mode === 'daily' ? `DIA #${dayNumber()} · ${level}` : `TREINO · ${level}`;
}

/**
 * Troca a dificuldade. Rodadas ainda não começadas mudam na hora;
 * as que já tiveram chute ou pulo continuam como estavam.
 */
function setDifficulty(id) {
  if (id === S.settings.difficulty) return;
  S.settings.difficulty = id;
  store.set('settings', S.settings);
  S.nextFree = null;
  const hard = isHard();
  for (const g of Object.values(S.games)) {
    if (g && g.round.status === 'playing' && g.round.history.length === 0) {
      g.hard = hard;
      if (g.mode === 'daily') store.set('daily', { key: g.key, playerId: g.player.id, round: g.round, hard });
    }
  }
  if (S.games.free?.round.history.length === 0) S.games.free = null; // sorteia de novo com o novo nível
  ui.setDifficulty(id);
  if (S.game) ui.setModeLabel(modeLabel(S.game.mode, S.game.hard));
  render();
}

async function start(mode) {
  const token = ++S.token;
  S.mode = mode;
  ui.setScreen('play');
  ui.setModeLabel(modeLabel(mode));
  ui.hideReveal();
  ui.setDifficulty(S.settings.difficulty);
  if (!isFresh(mode, S.games[mode])) ui.showLoading();
  if (!store.get('seenHelp')) openDialog('dlgHelp');

  try {
    const game = await loadGame(mode);
    if (token !== S.token) return; // trocou de modo enquanto carregava
    show(game);
  } catch (e) {
    if (token !== S.token) return;
    const offline = e instanceof TypeError || /fetch|network/i.test(e.message);
    ui.showError(offline ? 'Não consegui falar com o Wikidata. Confira sua internet.' : e.message, () => start(mode));
  }
}

function show(game) {
  S.game = game;
  S.view = null;
  ui.setModeLabel(modeLabel(game.mode, game.hard));
  render();
  if (game.round.status === 'playing' && matchMedia('(pointer: fine)').matches && !document.querySelector('dialog[open]')) {
    $('guess').focus();
  }
}

function render() {
  if (S.game) ui.renderStage(S.game, S.view, S.settings);
}

function goHome() {
  S.token++;
  ui.hideReveal();
  ui.setScreen('home');
  refreshHome();
}

function refreshHome() {
  const saved = store.get('daily');
  const dailyDone = saved?.key === dateKey() && saved.round.status !== 'playing';
  ui.setHome({ day: dayNumber(), dailyDone });
}

/* ---------- jogar ---------- */

function act(action) {
  const game = S.game;
  if (!game || game.round.status !== 'playing') return;
  play(game.round, game.player, game.career.length, action);
  S.view = null;
  if (game.mode === 'daily') store.set('daily', { key: game.key, playerId: game.player.id, round: game.round, hard: game.hard });

  if (game.round.status === 'playing') {
    ui.missFlash(action.type === 'skip' ? '▼ PRÓXIMO CLUBE' : '✗ NÃO É ELE');
  } else {
    finish(game);
  }
  render();
}

function finish(game) {
  const result = outcome(game.round, game.career.length);
  if (game.mode === 'daily') recordDaily(S.stats, game.key, game.round);
  else recordFree(S.stats, game.round, result.points);
  saveStats(S.stats);
  if (game.round.status === 'lost') ui.missFlash('FIM DA CARREIRA');
  setTimeout(() => {
    if (S.game === game) ui.showReveal(game, openResult);
  }, 900);
}

function openResult() {
  if (!S.game || S.game.round.status === 'playing') return;
  ui.renderResult(S.game, { day: dayNumber(S.game.key), pixel: S.settings.pixel });
  ui.tickCountdown(formatCountdown(msToMidnight()));
  openDialog('dlgResult');
}

function submitGuess(text, id) {
  text = String(text || '').trim();
  if (norm(text).length < 2) return ui.toast('Digite o nome de um jogador');
  const tried = S.game?.round.history.some((h) => h.type === 'miss' && norm(h.text) === norm(text));
  if (tried) return ui.toast('Você já chutou esse nome');
  ac.clear();
  act({ type: 'guess', text, id });
}

function currentShareText() {
  const g = S.game;
  return shareText({ round: g.round, total: g.career.length, result: outcome(g.round, g.career.length), hard: g.hard, mode: g.mode, day: dayNumber(g.key) });
}

function nextFromResult() {
  $('dlgResult').close();
  if (S.mode === 'free') S.games.free = null;
  start('free');
}

/* ---------- diálogos ---------- */

function openDialog(id) {
  if (id === 'dlgStats') ui.renderStats(S.stats);
  if (id === 'dlgSettings') ui.renderSettings(S.settings, dataInfo());
  const d = $(id);
  if (!d.open) d.showModal();
}

function dataInfo() {
  if (!S.data) return 'Dados: carregando…';
  if (S.data.kind === 'live') return 'Dados: Wikidata ao vivo.';
  const when = S.data.generated ? new Date(S.data.generated).toLocaleDateString('pt-BR') : '?';
  return `Dados: arquivo gerado do Wikidata em ${when}.`;
}

/* ---------- eventos ---------- */

const ac = attachAutocomplete({
  input: $('guess'),
  list: $('suggestions'),
  getIndex: () => S.index,
  onChoose: ({ text, id }) => submitGuess(text, id),
});

$('guessForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const current = ac.current();
  if (current) submitGuess(current.n, current.id);
  else submitGuess($('guess').value);
});

$('btnSkip').addEventListener('click', () => {
  ac.clear();
  act({ type: 'skip' });
});

$('trail').addEventListener('click', (e) => {
  const sq = e.target.closest('.sq-btn:not([disabled])');
  if (!sq || !S.game) return;
  S.view = +sq.dataset.i;
  render();
});

$('btnPlayDaily').addEventListener('click', () => {
  start('daily').then(() => {
    if (S.game?.mode === 'daily' && S.game.round.status !== 'playing') openResult();
  });
});
$('btnPlayFree').addEventListener('click', () => start('free'));
for (const btn of document.querySelectorAll('[data-diff]')) {
  btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
}
$('btnHome').addEventListener('click', goHome);
$('btnShowResult').addEventListener('click', openResult);
$('btnNext').addEventListener('click', nextFromResult);

$('resultBody').addEventListener('click', async (e) => {
  if (e.target.closest('#btnResultNext')) return nextFromResult();
  if (e.target.closest('#btnCopy')) {
    ui.toast((await copyText(currentShareText())) ? 'Resultado copiado!' : 'Não consegui copiar');
  } else if (e.target.closest('#btnShare')) {
    const result = await share(currentShareText());
    if (result === 'copied') ui.toast('Resultado copiado!');
    else if (result === 'failed') ui.toast('Não consegui compartilhar');
  }
});

for (const btn of document.querySelectorAll('[data-open]')) {
  btn.addEventListener('click', () => openDialog(btn.dataset.open));
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
}
$('dlgHelp').addEventListener('close', () => store.set('seenHelp', true));

$('settingsForm').addEventListener('change', (e) => {
  if (e.target.name === 'difficulty') return setDifficulty(e.target.value);
  const before = freeSignature();
  S.settings = {
    ...S.settings,
    clubNames: $('setNames').checked,
    pixel: $('setPixel').checked,
    youth: $('setYouth').checked,
  };
  store.set('settings', S.settings);
  render();
  if (freeSignature() !== before) {
    S.nextFree = null;
    ui.toast('Vale a partir do próximo jogador');
  }
});

setInterval(() => {
  ui.tickCountdown(formatCountdown(msToMidnight()));
  const g = S.games.daily;
  if (g && g.key !== dateKey() && g.round.status !== 'playing') {
    S.games.daily = null;
    if (S.mode === 'daily' && document.body.dataset.screen === 'play') start('daily');
    else refreshHome();
  }
}, 1000);

/* ---------- início ---------- */

let sceneW = 0;
function drawScene() {
  const w = sceneWidth(innerWidth / innerHeight);
  if (w === sceneW) return;
  sceneW = w;
  $('scene').innerHTML = stadiumScene(w);
}
addEventListener('resize', () => requestAnimationFrame(drawScene));

(function init() {
  drawScene();
  ui.spawnDust();
  refreshHome();
  ui.setDifficulty(S.settings.difficulty);
  ui.showLoading('Aquecendo os dados…');

  S.ready = loadData().then((data) => {
    S.data = data;
    $('guess').placeholder = 'carregando nomes…';
    data
      .names()
      .then((pairs) => {
        S.index = buildIndex(pairs);
        $('guess').placeholder = 'quem é o craque?';
      })
      .catch(() => ($('guess').placeholder = 'digite o nome do jogador'));
  });

  // Já prepara o craque do dia enquanto a pessoa olha a tela inicial.
  loadGame('daily').catch(() => {});
})();
