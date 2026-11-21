/** Regras para transformar as passagens do Wikidata em uma carreira jogável. */

/** Seleções principais, de base e olímpicas. */
export const NATIONAL_RE =
  /sele[cç][aã]o|selecci[oó]n|national (football |soccer )?(team|under)|national team|nationalmannschaft|squadra nazionale|[eé]quipe (de france|nationale)|olympic (football |soccer )?team/i;

/** Categorias de base, reservas e times B. */
export const YOUTH_RE =
  /\b(sub|under|u)[- ]?\d{2}\b|juvenil|juniores|youth|academy|reserves?\b|primavera|\bII\b|\bB\b|castilla|\bjong\b|atl[eè]tic$/i;

export const isNational = (s) => NATIONAL_RE.test(s.name) || NATIONAL_RE.test(s.en);
export const isYouth = (s) => YOUTH_RE.test(s.name) || YOUTH_RE.test(s.en);

/**
 * Ordena as passagens por data e junta passagens seguidas no mesmo clube.
 * @param {Array<{club:string,name:string,en:string,start:number|null,end:number|null,logo:string|null}>} spells
 * @param {{youth?: boolean}} options  youth = incluir categorias de base / times B
 */
export function buildCareer(spells, { youth = false } = {}) {
  const list = spells
    .filter((s) => (s.start || s.end) && (youth || !isYouth(s)))
    .map((s) => ({ ...s }))
    .sort((a, b) => (a.start ?? a.end) - (b.start ?? b.end) || (a.end ?? 9999) - (b.end ?? 9999));

  const career = [];
  for (const s of list) {
    const last = career.at(-1);
    if (last && last.club === s.club) {
      last.end = s.end;
      continue;
    }
    career.push(s);
  }
  return career;
}

export const yearsLabel = (c) => `${c.start ?? '?'}–${c.end ?? (c.start ? 'hoje' : '?')}`;
