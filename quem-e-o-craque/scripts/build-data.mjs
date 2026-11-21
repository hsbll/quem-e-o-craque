#!/usr/bin/env node
/**
 * Gera data/players.json e data/names.json a partir do Wikidata.
 * Roda automaticamente no GitHub Actions (toda segunda e a cada push),
 * ou manualmente com:  npm run data
 *
 * Formato compacto de players.json:
 *   clubs:   { "Q123": ["Nome PT", "Nome EN (se diferente)", "Arquivo do logo no Commons"] }
 *   players: [{ id, n: nome, a: [apelidos], s: sitelinks, c: [[clube, início, fim], ...] }]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { CONFIG } from '../assets/js/config.js';
import { fetchPool, fetchPlayers, fetchNames, byQid, dedupeNames } from '../assets/js/wikidata.js';
import { buildCareer } from '../assets/js/career.js';

const OUT = new URL('../data/', import.meta.url);
const BATCH = 40;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log('[dados]', ...args);

async function fetchBatch(ids, sitelinks) {
  try {
    return await fetchPlayers(ids, sitelinks);
  } catch (e) {
    log(`lote falhou (${e.message}), tentando um por um`);
    const out = [];
    for (const id of ids) {
      try {
        out.push(...(await fetchPlayers([id], sitelinks)));
      } catch {
        log(`  pulando ${id}`);
      }
    }
    return out;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  log(`buscando jogadores com ${CONFIG.buildMinSitelinks}+ artigos na Wikipédia…`);
  const pool = await fetchPool(CONFIG.buildMinSitelinks);
  const sitelinks = Object.fromEntries(pool.map((p) => [p.id, p.sitelinks]));
  const ids = pool.map((p) => p.id).sort(byQid);
  log(`${ids.length} jogadores encontrados`);

  const clubs = {};
  const players = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = await fetchBatch(ids.slice(i, i + BATCH), sitelinks);
    for (const p of batch) {
      if (!p.name || buildCareer(p.spells, { youth: false }).length < CONFIG.minClubs) continue;
      const spells = p.spells.filter((s) => s.start || s.end);
      for (const s of spells) {
        clubs[s.club] ??= [s.name, s.en !== s.name ? s.en : '', s.logo || ''];
      }
      players.push({
        id: p.id,
        n: p.name,
        a: p.names.filter((x) => x !== p.name),
        s: p.sitelinks,
        c: spells.map((s) => [s.club, s.start, s.end]),
      });
    }
    log(`${Math.min(i + BATCH, ids.length)}/${ids.length} processados, ${players.length} jogáveis`);
    await sleep(500);
  }

  if (players.length < 50) throw new Error(`Só ${players.length} jogadores válidos; algo deu errado.`);

  for (const c of Object.values(clubs)) while (c.length && !c.at(-1)) c.pop();
  await writeFile(
    new URL('players.json', OUT),
    JSON.stringify({ generated: new Date().toISOString(), source: 'Wikidata (CC0)', clubs, players }),
  );
  log(`players.json: ${players.length} jogadores, ${Object.keys(clubs).length} clubes`);

  let names = [];
  for (const min of CONFIG.namesMinSitelinks) {
    try {
      names = await fetchNames(min);
      log(`lista de nomes com ${min}+ artigos: ${names.length} nomes`);
      break;
    } catch (e) {
      log(`lista de nomes falhou com limiar ${min}: ${e.message}`);
    }
  }
  // Garante que todo jogador sorteável está na lista do autocompletar.
  const fromPlayers = players.flatMap((p) => [p.n, ...p.a].map((n) => [n, p.id]));
  names = dedupeNames([...fromPlayers, ...names]);
  await writeFile(new URL('names.json', OUT), JSON.stringify(names));
  log(`names.json: ${names.length} nomes`);
}

main().catch((e) => {
  console.error('[dados] erro:', e);
  process.exit(1);
});
