/**
 * Consultas ao Wikidata (SPARQL). Funciona no navegador e no Node 18+,
 * então o mesmo código serve para o jogo e para o script que gera os dados.
 *
 * Propriedades usadas:
 *   P106 ocupação = Q937857 (futebolista)   P54 membro de equipe esportiva
 *   P580 / P582 início / fim                 P154 logotipo
 *   Q6979593 seleção nacional de futebol
 */
import { CONFIG } from './config.js';
import { isNational } from './career.js';

const IS_NODE = typeof window === 'undefined';
const LANGS = CONFIG.langs.map((l) => `"${l}"`).join(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1);
export const byQid = (a, b) => +a.slice(1) - +b.slice(1);

export async function sparql(query, retries = 3) {
  const url = `${CONFIG.sparqlEndpoint}?format=json&query=${encodeURIComponent(query)}`;
  const headers = { Accept: 'application/sparql-results+json' };
  if (IS_NODE) headers['User-Agent'] = CONFIG.userAgent;

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return (await res.json()).results.bindings;
      const error = new Error(`Wikidata respondeu ${res.status}`);
      error.retry = res.status === 429 || res.status >= 500;
      throw error;
    } catch (error) {
      const canRetry = error.retry !== false && attempt < retries;
      if (!canRetry) throw error;
      await sleep(2000 * (attempt + 1));
    }
  }
}

/** Jogadores com pelo menos `min` artigos na Wikipédia. */
export async function fetchPool(min) {
  const rows = await sparql(`SELECT ?p ?l WHERE {
    ?p wdt:P106 wd:Q937857 ; wikibase:sitelinks ?l . FILTER(?l >= ${min}) }`);
  const map = new Map(rows.map((r) => [qid(r.p.value), +r.l.value]));
  return [...map].map(([id, sitelinks]) => ({ id, sitelinks }));
}

/** Lista de nomes para o autocompletar: [[nome, QID], ...] */
export async function fetchNames(min) {
  const rows = await sparql(`SELECT ?p ?n WHERE {
    ?p wdt:P106 wd:Q937857 ; wikibase:sitelinks ?l . FILTER(?l >= ${min})
    ?p rdfs:label ?n . FILTER(LANG(?n) IN (${LANGS})) }`);
  return dedupeNames(rows.map((r) => [r.n.value, qid(r.p.value)]));
}

export function dedupeNames(pairs) {
  const seen = new Set();
  return pairs.filter(([name, id]) => {
    const key = `${id}|${name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const langRank = (lang) => {
  const i = CONFIG.langs.indexOf(lang);
  return i < 0 ? 99 : i;
};
const year = (b) => (b && /^\d{4}/.test(b.value) ? +b.value.slice(0, 4) : null);
const logoFile = (uri) => decodeURIComponent(uri.slice(uri.lastIndexOf('/') + 1));

/**
 * Nome, apelidos e passagens por clube de vários jogadores de uma vez.
 * Seleções já saem filtradas.
 */
export async function fetchPlayers(ids, sitelinks = {}) {
  if (!ids.length) return [];
  const values = ids.map((id) => `wd:${id}`).join(' ');

  const [labels, career] = await Promise.all([
    sparql(`SELECT ?p ?n ?a WHERE { VALUES ?p { ${values} }
      { ?p rdfs:label ?n . FILTER(LANG(?n) IN (${LANGS})) }
      UNION { ?p skos:altLabel ?a . FILTER(LANG(?a) IN (${LANGS})) } }`),
    sparql(`SELECT ?p ?st ?team ?teamLabel ?en ?start ?end ?logo ?nat WHERE { VALUES ?p { ${values} }
      ?p p:P54 ?st . ?st ps:P54 ?team .
      OPTIONAL { ?st pq:P580 ?start }
      OPTIONAL { ?st pq:P582 ?end }
      OPTIONAL { ?team wdt:P154 ?logo }
      OPTIONAL { ?team rdfs:label ?en . FILTER(LANG(?en) = "en") }
      BIND(EXISTS { ?team wdt:P31/wdt:P279* wd:Q6979593 } AS ?nat)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${CONFIG.langs.join(',')},mul". } }`),
  ]);

  const players = new Map(
    ids.map((id) => [id, { id, name: '', rank: 99, names: new Set(), sitelinks: sitelinks[id] ?? 0, spells: new Map() }]),
  );

  for (const r of labels) {
    const p = players.get(qid(r.p.value));
    if (!p) continue;
    if (r.n) {
      p.names.add(r.n.value);
      const rank = langRank(r.n['xml:lang']);
      if (rank < p.rank) Object.assign(p, { rank, name: r.n.value });
    }
    if (r.a) p.names.add(r.a.value);
  }

  for (const r of career) {
    const p = players.get(qid(r.p.value));
    if (!p || p.spells.has(r.st.value)) continue; // vários logos = linhas repetidas
    const name = r.teamLabel?.value || qid(r.team.value);
    const spell = {
      club: qid(r.team.value),
      name,
      en: r.en?.value || name,
      start: year(r.start),
      end: year(r.end),
      logo: r.logo ? logoFile(r.logo.value) : null,
    };
    p.spells.set(r.st.value, r.nat?.value === 'true' || isNational(spell) ? null : spell);
  }

  return [...players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    names: [...p.names],
    sitelinks: p.sitelinks,
    spells: [...p.spells.values()].filter(Boolean),
  }));
}
