/** Autocompletar com tolerância a erros de digitação (trigramas). */
import { norm, esc } from './text.js';

export const buildIndex = (pairs) => pairs.map(([n, id]) => ({ n, id, k: norm(n) }));

function trigrams(s) {
  const set = new Set();
  const padded = ` ${s} `;
  for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
  return set;
}

export function search(index, query, limit = 8) {
  const q = norm(query);
  if (q.length < 2) return [];
  const hits = [];

  for (const e of index) {
    if (e.k.startsWith(q)) hits.push([4, e]);
    else if (e.k.includes(` ${q}`)) hits.push([3, e]);
    else if (e.k.includes(q)) hits.push([2, e]);
  }

  // Só procura parecidos (erros de digitação) se faltaram resultados diretos.
  if (hits.length < limit && q.length >= 4) {
    const qg = trigrams(q);
    for (const e of index) {
      if (e.k.includes(q)) continue;
      const g = trigrams(e.k);
      let shared = 0;
      for (const t of qg) if (g.has(t)) shared++;
      const score = shared / qg.size;
      if (score >= 0.5) hits.push([score, e]);
    }
  }

  hits.sort((a, b) => b[0] - a[0] || a[1].n.length - b[1].n.length);
  const seen = new Set();
  const out = [];
  for (const [, e] of hits) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
    if (out.length === limit) break;
  }
  return out;
}

export function attachAutocomplete({ input, list, getIndex, onChoose }) {
  let items = [];
  let active = -1;
  let timer;

  const close = () => {
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const setActive = (i) => {
    active = i;
    [...list.children].forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', `sug-${i}`);
      list.children[i].scrollIntoView({ block: 'nearest' });
    }
  };

  const render = () => {
    const index = getIndex();
    items = index ? search(index, input.value) : [];
    if (!items.length) return close();
    list.innerHTML = items
      .map((e, i) => `<li id="sug-${i}" role="option" aria-selected="false" data-i="${i}">${esc(e.n)}</li>`)
      .join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 60);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') (e.preventDefault(), setActive((active + 1) % items.length));
    else if (e.key === 'ArrowUp') (e.preventDefault(), setActive((active - 1 + items.length) % items.length));
    else if (e.key === 'Escape') close();
  });

  list.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    const item = items[+li.dataset.i];
    close();
    onChoose({ text: item.n, id: item.id });
  });

  input.addEventListener('blur', () => setTimeout(close, 120));

  return {
    close,
    current: () => (!list.hidden && active >= 0 ? items[active] : null),
    clear() {
      input.value = '';
      close();
    },
  };
}
