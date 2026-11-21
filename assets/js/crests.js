/**
 * Escudos: 1) Wikimedia Commons (logo do Wikidata), 2) TheSportsDB como reserva,
 * 3) escudo desenhado com as iniciais quando nenhum dos dois existe.
 */
import { CONFIG } from './config.js';
import { esc } from './text.js';

const badgeCache = new Map();

export const commonsUrl = (file, width = 256) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;

function fetchBadge(name) {
  if (!name) return Promise.resolve(null);
  if (!badgeCache.has(name)) {
    const url = `https://www.thesportsdb.com/api/v1/json/${CONFIG.theSportsDbKey}/searchteams.php?t=${encodeURIComponent(name)}`;
    const job = fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const teams = j?.teams || [];
        const team = teams.find((t) => t.strSport === 'Soccer') || teams[0];
        return team?.strBadge || team?.strTeamBadge || null;
      })
      .catch(() => null);
    badgeCache.set(name, job);
  }
  return badgeCache.get(name);
}

function preload(src, timeout = 8000) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), timeout);
    img.onload = () => (clearTimeout(timer), resolve(true));
    img.onerror = () => (clearTimeout(timer), resolve(false));
    img.src = src;
  });
}

/** Retorna a URL de um escudo que carregou de verdade, ou null. */
export async function resolveCrest(spell) {
  if (spell.logo) {
    const url = commonsUrl(spell.logo);
    if (await preload(url)) return url;
  }
  const badge = await fetchBadge(spell.en || spell.name);
  if (badge && (await preload(badge))) return badge;
  return null;
}

export function crestHTML(spell, src) {
  return src ? `<img src="${esc(src)}" alt="" draggable="false" data-px>` : shieldSVG(spell.en || spell.name);
}

/**
 * Transforma os escudos em pixel art: desenha a imagem em um canvas pequeno
 * e deixa o CSS ampliar sem suavizar (image-rendering: pixelated).
 */
export function pixelateIn(root, size = 44) {
  for (const img of root.querySelectorAll('img[data-px]')) {
    img.removeAttribute('data-px');
    const draw = () => {
      if (!img.naturalWidth || !img.isConnected) return;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      const k = Math.min(size / img.naturalWidth, size / img.naturalHeight);
      const w = Math.round(img.naturalWidth * k);
      const h = Math.round(img.naturalHeight * k);
      ctx.drawImage(img, Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h);
      canvas.setAttribute('aria-hidden', 'true');
      img.replaceWith(canvas);
    };
    if (img.complete) draw();
    else img.addEventListener('load', draw, { once: true });
  }
}

function shieldSVG(name) {
  const words = name
    .replace(/\b(fc|cf|sc|ac|afc|club|clube|de|da|do|del|futebol|football|calcio|sport|sporting)\b/gi, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || name).slice(0, 3)).toUpperCase();
  let hue = 0;
  for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return `<svg viewBox="0 0 100 100" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M50 4 90 16v30c0 26-18 42-40 50C28 88 10 72 10 46V16Z" fill="hsl(${hue} 55% 40%)"/>
    <path d="M50 4 90 16v30c0 26-18 42-40 50Z" fill="rgba(0,0,0,.18)"/>
    <path d="M50 11 84 21v25c0 22-15 36-34 43" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/>
    <text x="50" y="61" text-anchor="middle" font-family="Silkscreen,monospace" font-weight="700"
      font-size="${initials.length > 2 ? 26 : 32}" fill="#fff">${esc(initials)}</text></svg>`;
}
