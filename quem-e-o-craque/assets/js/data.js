/**
 * Fonte de dados do jogo.
 *  - "static": usa data/players.json e data/names.json (gerados pelo GitHub Actions). Rápido e estável.
 *  - "live": se os arquivos não existirem, consulta o Wikidata direto do navegador.
 * As duas expõem a mesma interface: pool(min), player(id), names().
 */
import { CONFIG } from './config.js';
import { getCached, setCached } from './storage.js';
import { fetchPool, fetchPlayers, fetchNames, byQid, dedupeNames } from './wikidata.js';

export async function loadData() {
  try {
    const res = await fetch('data/players.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    return staticSource(await res.json());
  } catch {
    return liveSource();
  }
}

function expand(p, clubs) {
  return {
    id: p.id,
    name: p.n,
    names: p.a || [],
    sitelinks: p.s || 0,
    spells: p.c.map(([club, start, end]) => {
      const [name = club, en = '', logo = ''] = clubs[club] || [];
      return { club, name, en: en || name, logo: logo || null, start, end };
    }),
  };
}

function staticSource(json) {
  const players = json.players.map((p) => expand(p, json.clubs));
  const byId = new Map(players.map((p) => [p.id, p]));
  return {
    kind: 'static',
    generated: json.generated,
    async pool(min) {
      return players.filter((p) => p.sitelinks >= min).map((p) => p.id).sort(byQid);
    },
    async player(id) {
      return byId.get(id) || null;
    },
    async names() {
      try {
        const res = await fetch('data/names.json');
        if (!res.ok) throw new Error(String(res.status));
        return await res.json();
      } catch {
        return dedupeNames(players.flatMap((p) => [p.name, ...p.names].map((n) => [n, p.id])));
      }
    },
  };
}

function liveSource() {
  const cache = new Map();
  return {
    kind: 'live',
    generated: null,
    async pool(min) {
      const key = `pool${min}`;
      const hit = getCached(key, 7);
      if (hit) return hit;
      const ids = (await fetchPool(min)).map((p) => p.id).sort(byQid);
      setCached(key, ids);
      return ids;
    },
    player(id) {
      if (!cache.has(id)) cache.set(id, fetchPlayers([id]).then((list) => list[0] || null).catch(() => null));
      return cache.get(id);
    },
    async names() {
      const hit = getCached('names', 14);
      if (hit) return hit;
      for (const min of CONFIG.namesMinSitelinks) {
        try {
          const list = await fetchNames(min);
          setCached('names', list);
          return list;
        } catch (e) {
          console.warn('Lista de nomes falhou com limiar', min, e);
        }
      }
      return [];
    },
  };
}
