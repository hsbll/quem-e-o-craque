/**
 * Configurações do jogo. É o único arquivo que você precisa mexer
 * para ajustar dificuldade, pontuação, textos e fontes de dados.
 */
export const CONFIG = {
  title: 'Quem é o Craque?',

  /** Dia 1 do "Craque do dia" (o número aparece no compartilhamento). */
  launchDate: '2026-11-22',

  /** Fontes de dados abertas (sem cadastro). */
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
  /** O Wikidata pede um User-Agent identificável em scripts (usado só no Node). */
  userAgent: 'QuemEOCraque/1.0 (https://github.com/hsbll/quem-e-o-craque)',
  /** Chave pública gratuita do TheSportsDB, usada só como reserva de escudos. */
  theSportsDbKey: '123',

  /** Idiomas dos nomes, em ordem de preferência. */
  langs: ['pt-br', 'pt', 'en', 'es'],

  /** Mínimo de clubes (com datas) para um jogador entrar no sorteio. */
  minClubs: 3,

  /**
   * "Fama" = número de artigos na Wikipédia (sitelinks).
   * Quanto maior o número, mais conhecido o jogador.
   */
  dailyMinSitelinks: 90,
  buildMinSitelinks: 45,
  /** A lista de nomes do autocompletar é bem maior que o banco de sorteio. */
  namesMinSitelinks: [20, 35, 60],

  /**
   * Dificuldade (vale para o Craque do dia e para o Treino livre).
   *  min: fama mínima dos jogadores sorteados no treino (artigos na Wikipédia)
   *  years: mostrar os anos de cada passagem durante a rodada
   */
  difficulties: [
    { id: 'facil', label: 'Fácil', hint: 'Jogadores famosos e os anos de cada clube', min: 120, years: true },
    { id: 'dificil', label: 'Difícil', hint: 'Mais jogadores e sem os anos das passagens', min: 45, years: false },
  ],

  /** Pontos por escudo poupado: começa em (nº de clubes × pointsPerCrest) e cai a cada escudo revelado. */
  pointsPerCrest: 10,
};
