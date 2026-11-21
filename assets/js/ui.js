/** Tudo que desenha na tela. Recebe o estado e não altera nada do jogo. */
import { CONFIG } from './config.js';
import { esc } from './text.js';
import { crestHTML, pixelateIn } from './crests.js';
import { yearsLabel } from './career.js';
import { outcome, pointsFor } from './game.js';
import { sprite } from './sprites.js';

const $ = (id) => document.getElementById(id);
const upper = (s) => s.toLocaleUpperCase('pt-BR');

/* ---------- telas ---------- */

export function setScreen(screen) {
  document.body.dataset.screen = screen;
  window.scrollTo(0, 0);
}

export function setHome({ day, dailyDone }) {
  $('homeDay').textContent = `CRAQUE DO DIA #${day}`;
  $('ctaLabel').textContent = dailyDone ? 'VER SÚMULA DE HOJE' : 'ENTRAR EM CAMPO';
}

/** Marca o nível escolhido nos seletores da tela inicial e do jogo. */
export function setDifficulty(id) {
  for (const btn of document.querySelectorAll('[data-diff]')) btn.setAttribute('aria-pressed', String(btn.dataset.diff === id));
}

export function setModeLabel(text) {
  $('modeLabel').textContent = text;
}

/** Partículas que sobem devagar pelo fundo do jogo. */
export function spawnDust(count = 26) {
  let html = '';
  for (let i = 0; i < count; i++) {
    const dur = 14 + Math.random() * 22;
    html += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(100 + Math.random() * 10).toFixed(1)}%;
      animation-duration:${dur.toFixed(1)}s;animation-delay:-${(Math.random() * dur).toFixed(1)}s"></i>`;
  }
  $('dust').innerHTML = html;
}

/* ---------- carregando / erro ---------- */

export function showLoading(text = 'Escolhendo o craque…') {
  document.body.dataset.state = 'loading';
  $('crest').innerHTML = '<div class="skeleton"></div>';
  $('crest').dataset.k = '';
  $('crestYears').textContent = '';
  $('crestName').textContent = text;
  $('panelLabel').textContent = 'AQUECENDO';
  $('stepLabel').textContent = 'AQUECENDO';
  $('hudSeason').textContent = '----';
  $('worth').textContent = '---';
  $('trail').innerHTML = '';
  $('misses').innerHTML = '';
  $('careerRuler').innerHTML = '';
  $('guessForm').hidden = false;
  $('donePanel').hidden = true;
  setDockEnabled(false);
}

export function showError(message, onRetry) {
  document.body.dataset.state = 'error';
  $('crest').innerHTML = '<div class="crest-error">!</div>';
  $('crest').dataset.k = '';
  $('panelLabel').textContent = 'SEM SINAL';
  $('crestName').innerHTML = `${esc(message)} <button type="button" class="link" id="btnRetry">Tentar de novo</button>`;
  $('btnRetry').onclick = onRetry;
}

export function setDockEnabled(on) {
  for (const id of ['guess', 'btnGuess', 'btnSkip']) $(id).disabled = !on;
}

/* ---------- jogo ---------- */

export function focusIndex(game, view) {
  const { round, career } = game;
  const visible = round.status !== 'playing' ? career.length : round.shown;
  if (view != null && view < visible) return view;
  return Math.min(round.shown, career.length) - 1;
}

export function renderStage(game, view, settings) {
  document.body.dataset.state = game.round.status;
  const { round, career, crests } = game;
  const total = career.length;
  const over = round.status !== 'playing';
  const visible = over ? total : round.shown;
  const idx = focusIndex(game, view);
  const club = career[idx];
  const src = crests[idx];

  // o céu escurece a cada escudo revelado
  $('play').style.setProperty('--depth', total > 1 ? ((round.shown - 1) / (total - 1)).toFixed(2) : 0);

  const key = `${game.player.id}:${idx}:${src}:${settings.pixel}`;
  const el = $('crest');
  if (el.dataset.k !== key) {
    el.dataset.k = key;
    el.innerHTML = src === undefined ? '<div class="skeleton"></div>' : crestHTML(club, src);
    if (settings.pixel) pixelateIn(el);
    el.classList.remove('drop-in');
    void el.offsetWidth;
    el.classList.add('drop-in');
  }

  $('panelLabel').textContent = over
    ? round.status === 'won' ? `ACERTOU · CLUBE ${idx + 1} DE ${total}` : `FIM DA CARREIRA · CLUBE ${idx + 1} DE ${total}`
    : `CLUBE ${idx + 1} DA CARREIRA`;
  const showYears = !game.hard || over;
  $('crestYears').textContent = showYears ? yearsLabel(club) : '????–????';
  $('crestYears').classList.toggle('masked', !showYears);
  $('crestName').textContent = settings.clubNames || over ? club.name : '';
  $('hudSeason').textContent = showYears ? club.start ?? club.end ?? '----' : '????';

  $('worth').textContent = over ? outcome(round, total).points : pointsFor(round.shown, total);
  $('stepLabel').textContent = `ESCUDO ${Math.min(round.shown, total)} DE ${total}`;

  $('trail').innerHTML = career
    .map((c, i) => {
      const h = round.history[i];
      const locked = i >= visible;
      const state = locked ? 'locked' : h ? h.type : over ? 'open' : 'current';
      const label = locked ? `Clube ${i + 1}, escondido` : `Ver clube ${i + 1}`;
      return `<li><button type="button" class="sq-btn ${state}${i === idx && !locked ? ' viewing' : ''}" data-i="${i}"
        ${locked ? 'disabled' : ''} aria-label="${label}"></button></li>`;
    })
    .join('');

  $('careerRuler').innerHTML = career
    .map((c, i) => {
      const y = total > 1 ? (i / (total - 1)) * 100 : 0;
      const shown = i < visible;
      const label = shown && showYears ? c.start ?? '?' : '····';
      return `<span class="${i === idx ? 'on' : ''}" style="--y:${y}%">${label}</span>`;
    })
    .join('');

  $('misses').innerHTML = round.history
    .filter((h) => h.type !== 'hit')
    .map((h) => (h.type === 'skip' ? '<li class="skip">PULOU</li>' : `<li>${esc(upper(h.text))}</li>`))
    .join('');

  $('guessForm').hidden = over;
  $('donePanel').hidden = !over;
  if (over) {
    $('doneText').innerHTML =
      game.mode === 'daily'
        ? 'PRÓXIMO CRAQUE EM<strong data-countdown>--:--:--</strong>'
        : `${round.status === 'won' ? 'ACERTOU' : 'ERA'}<strong>${esc(game.player.name)}</strong>`;
    $('btnNext').textContent = game.mode === 'daily' ? 'TREINO LIVRE ∞' : 'PRÓXIMO ∞';
  }
  setDockEnabled(!over);
}

export function missFlash(text) {
  const panel = $('crestCard');
  $('missFlash').textContent = text;
  panel.classList.remove('missed');
  void panel.offsetWidth;
  panel.classList.add('missed');
}

/* ---------- revelação do resultado ---------- */

export function showReveal(game, onContinue) {
  const { round, player } = game;
  const res = outcome(round, game.career.length);
  const won = res.won;
  const bubbles = Array.from(
    { length: 7 },
    (_, i) => `<i style="left:${10 + i * 13}%;bottom:${10 + (i % 3) * 12}%;animation-delay:${(i * 0.37).toFixed(2)}s"></i>`,
  ).join('');

  const inner = $('revealInner');
  inner.style.setProperty('--tier', res.color);
  inner.innerHTML = `
    <div class="sprite-wrap"><span class="bubbles">${bubbles}</span>${sprite(res.sprite)}</div>
    <h2>${res.title}</h2>
    <p class="quote">${won ? '' : 'Era '}“${esc(player.name)}”</p>
    <p class="pts"><b>+${res.points} PTS</b> · ${won ? `${round.shown} escudo${round.shown > 1 ? 's' : ''}` : 'carreira encerrada'}</p>
    <p class="line">${esc(res.line)}</p>
    <button type="button" class="btn cyan" id="btnReveal">VER SÚMULA ▼</button>`;
  $('reveal').hidden = false;
  const btn = $('btnReveal');
  btn.focus();
  btn.onclick = () => {
    $('reveal').hidden = true;
    onContinue();
  };
}

export function hideReveal() {
  $('reveal').hidden = true;
}

/* ---------- súmula ---------- */

export function renderResult(game, { day, pixel }) {
  const { round, career, crests, player } = game;
  const res = outcome(round, career.length);
  const won = res.won;
  const squares = career.map((_, i) => `<i class="${round.history[i]?.type || ''}"></i>`).join('');

  const log = career
    .map((c, i) => {
      const h = round.history[i];
      const note = !h
        ? won ? 'NÃO PRECISOU' : ''
        : h.type === 'hit' ? `✓ ACERTOU “${esc(h.text)}”`
        : h.type === 'skip' ? '▼ PULOU'
        : `✗ CHUTE “${esc(h.text)}”`;
      return `<li class="${h?.type || ''}">${crestHTML(c, crests[i] ?? null)}
        <span class="club">${esc(c.name)}<small>${note}</small></span><span class="yrs">${yearsLabel(c)}</span></li>`;
    })
    .join('');

  const body = $('resultBody');
  body.innerHTML = `
    <div class="sum-head">
      <span class="mini-logo">CRAQUE?</span>
      <span class="mono-label">${game.mode === 'daily' ? `DIA #${day} · FIM DE JOGO` : 'TREINO · FIM DE JOGO'}</span>
    </div>
    <div class="score-line" style="--tier:${res.color}">
      <span class="score-big">${res.points}</span>
      <span class="score-tier">PTS · ${res.title}</span>
    </div>
    <p class="sum-player">${won ? 'Você acertou' : 'Era'} <b>${esc(player.name)}</b>${won ? ` com ${round.shown} escudo${round.shown > 1 ? 's' : ''}` : ''}.</p>
    <div class="sum-squares" aria-hidden="true">${squares}</div>
    <div class="sum-actions">
      <button type="button" class="btn pink" id="btnCopy">COPIAR</button>
      <button type="button" class="btn dark" id="btnShare">ENVIAR_</button>
      <button type="button" class="btn cyan" id="btnResultNext">${game.mode === 'daily' ? 'TREINO LIVRE ∞' : 'PRÓXIMO JOGADOR ∞'}</button>
    </div>
    ${game.mode === 'daily' ? '<p class="countdown">PRÓXIMO CRAQUE EM <strong data-countdown>--:--:--</strong></p>' : ''}
    <h3>SÚMULA · CARREIRA COMPLETA</h3>
    <ol class="log">${log}</ol>
    <p class="fine"><a href="https://www.wikidata.org/wiki/${esc(player.id)}" target="_blank" rel="noopener">Ver ${esc(player.name)} no Wikidata ↗</a></p>`;
  if (pixel) pixelateIn(body, 32);
}

/* ---------- estatísticas, ajuda, ajustes ---------- */

export function renderStats(stats) {
  const d = stats.daily;
  const f = stats.free;
  const pct = d.played ? Math.round((d.wins / d.played) * 100) : 0;
  const buckets = ['1', '2', '3', '4', '5', '6', 'x'];
  const max = Math.max(1, ...buckets.map((b) => d.dist[b] || 0));
  const bars = buckets
    .map((b) => {
      const n = d.dist[b] || 0;
      const label = b === 'x' ? 'ERROU' : b === '6' ? '6+' : b;
      return `<div class="bar-row"><span>${label}</span><div class="bar ${b === 'x' ? 'lost' : ''}"
        style="width:${Math.max(8, (n / max) * 100)}%">${n}</div></div>`;
    })
    .join('');

  $('statsBody').innerHTML = `
    <h3>CRAQUE DO DIA</h3>
    <div class="numbers">
      <div><b>${d.played}</b>JOGOS</div><div><b>${pct}%</b>ACERTOS</div>
      <div><b>${d.streak}</b>SEQUÊNCIA</div><div><b>${d.best}</b>RECORDE</div>
    </div>
    <h3>ESCUDOS ATÉ ACERTAR</h3>
    <div class="bars">${bars}</div>
    <h3>TREINO LIVRE</h3>
    <div class="numbers">
      <div><b>${f.played}</b>JOGOS</div><div><b>${f.wins}</b>ACERTOS</div>
      <div><b>${f.points}</b>PONTOS</div><div><b>${f.best}</b>RECORDE</div>
    </div>`;
}

export function renderSettings(settings, dataInfo) {
  $('setNames').checked = settings.clubNames;
  $('setPixel').checked = settings.pixel;
  $('setYouth').checked = settings.youth;
  $('diffOptions').innerHTML = CONFIG.difficulties
    .map(
      (d) => `<label class="choice"><input type="radio" name="difficulty" value="${d.id}" ${d.id === settings.difficulty ? 'checked' : ''}>
        <span><b>${esc(d.label)}</b><small>${esc(d.hint)}</small></span></label>`,
    )
    .join('');
  $('dataInfo').textContent = dataInfo;
}

/* ---------- avisos ---------- */

let toastTimer;
export function toast(message) {
  const t = $('toast');
  t.textContent = upper(message);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

export function tickCountdown(text) {
  for (const el of document.querySelectorAll('[data-countdown]')) el.textContent = text;
}
