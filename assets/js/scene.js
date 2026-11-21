/**
 * Cenário da tela inicial: estádio em pixel art (céu, nuvens, arquibancada,
 * refletores e gramado). Gerado em SVG com pixels nítidos. A largura se
 * adapta ao formato da tela para os refletores nunca ficarem cortados.
 */
const H = 180;
const r = (x, y, w, h, fill, extra = '') =>
  `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" fill="${fill}"${extra}/>`;

/** Gerador pseudoaleatório com semente: a torcida fica sempre igual. */
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function cloud(x, y, s, cls) {
  const parts = [
    [4, 0, 10, 3, '#ffffff'], [2, 3, 18, 3, '#ffffff'], [0, 6, 26, 4, '#ffffff'],
    [14, 1, 6, 2, '#ffffff'], [20, 4, 4, 2, '#ffffff'], [0, 10, 26, 2, '#e3eef6'], [3, 12, 18, 1, '#e3eef6'],
  ];
  const body = parts.map(([a, b, c, d, f]) => `<rect x="${a}" y="${b}" width="${c}" height="${d}" fill="${f}"/>`).join('');
  return `<g class="${cls}"><g transform="translate(${Math.round(x)} ${y}) scale(${s})">${body}</g></g>`;
}

function floodlight(x, flag) {
  let g = r(x + 6, 46, 3, 66, '#16233a') + r(x, 34, 16, 12, '#16233a');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g += r(x + 2 + i * 4, 36 + j * 5, 3, 3, '#fff3b0', ' class="lamp"');
  if (flag) g += r(x + 7, 24, 1, 10, '#16233a') + r(x + 8, 24, 6, 2, '#ff4f8b') + r(x + 8, 26, 4, 2, '#ff4f8b') + r(x + 8, 28, 2, 1, '#ff4f8b');
  return g;
}

/** Largura ideal do cenário para a tela atual (em "pixels" do desenho). */
export const sceneWidth = (aspect) => Math.round(Math.min(320, Math.max(100, H * aspect)));

export function stadiumScene(W = 320) {
  const rand = rng(7);
  const mid = W / 2;
  let svg = '';

  // nuvens
  svg += cloud(W * 0.05, 14, W < 180 ? 1 : 1.4, 'cloud c1');
  svg += cloud(W * 0.42, 6, Math.min(2.2, W / 145), 'cloud c2');
  if (W > 180) svg += cloud(W * 0.8, 22, 1.2, 'cloud c3');

  // refletores
  const edge = Math.max(3, Math.round(W * 0.08));
  svg += floodlight(edge, false) + floodlight(W - edge - 16, true);

  // arquibancada em degraus
  const tops = [[0, 98], [0.125, 102], [0.28, 106], [0.72, 106], [0.875, 102]].map(([f, y]) => [Math.round(f * W), y]);
  tops.forEach(([x, y], i) => {
    const next = tops[i + 1]?.[0] ?? W;
    svg += r(x, y, next - x, 134 - y, '#1b2b46');
  });
  for (let y = 108; y < 132; y += 4) svg += r(0, y, W, 1, '#24385a');

  // torcida
  const crowd = ['#ff4f8b', '#4de1ff', '#ffd166', '#f4f7fb', '#7cf29c'];
  for (let i = 0; i < W * 0.8; i++) {
    const x = Math.floor(rand() * W);
    const y = 106 + Math.floor(rand() * 6) * 4 + 1;
    if (rand() < 0.55) svg += r(x, y, 1, 2, crowd[Math.floor(rand() * crowd.length)], ' opacity=".75"');
  }

  // muro com faixa de LED
  svg += r(0, 132, W, 3, '#0f1a2e') + r(0, 132, W, 1, '#4de1ff', ' opacity=".55"');

  // gramado com faixas e linhas de cal
  for (let y = 135, i = 0; y < H; y += 5, i++) svg += r(0, y, W, 5, i % 2 ? '#2a6a3f' : '#2f7646');
  svg += r(0, 138, W, 1, '#e8f5ec', ' opacity=".6"') + r(mid - 1, 138, 2, H - 138, '#e8f5ec', ' opacity=".45"');
  [[-22, 0], [-21, 3], [-19, 6], [-16, 9], [-12, 11], [-6, 13], [0, 13]].forEach(([dx, dy]) => {
    svg += r(mid + dx, 139 + dy, 3, 1, '#e8f5ec', ' opacity=".45"');
    svg += r(mid - 3 - dx, 139 + dy, 3, 1, '#e8f5ec', ' opacity=".45"');
  });

  // bola
  const bx = Math.round(W * 0.67);
  svg += `<g class="scene-ball"><g transform="translate(${bx} 150)">${r(1, 0, 4, 1, '#f4f7fb')}${r(0, 1, 6, 4, '#f4f7fb')}${r(1, 5, 4, 1, '#c9d3e0')}${r(2, 2, 2, 2, '#0b1424')}</g></g>`;
  svg += r(bx, 157, 6, 1, '#123a22');

  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-hidden="true">${svg}</svg>`;
}
